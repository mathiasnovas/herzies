import { app, BrowserWindow, Tray, nativeImage, ipcMain, Notification, shell, net } from "electron";
import { createServer } from "node:http";
import { URL } from "node:url";
import { join } from "node:path";
import { getNowPlaying } from "./nowplaying.js";
import { loadHerzie, saveHerzie, loadSession, loadMultipliers, saveMultipliers, saveSession, clearSession } from "./storage.js";
import {
  apiSync, isLoggedIn, apiAddFriend, apiRemoveFriend, apiLookupHerzie, apiLookupHerzies,
  apiFetchInventory, apiSellItem, apiCreateTrade, apiJoinTrade, apiUpdateTradeOffer,
  apiLockTrade, apiAcceptTrade, apiCancelTrade, apiPollTrade, apiRegisterHerzie, apiGetMe,
} from "./api.js";
import {
  type Herzie,
  getDailyCraving,
  matchesCraving,
  applyXp,
  calculateXpGain,
  classifyGenre,
  recordGenreMinutes,
} from "@herzies/shared";

const POLL_INTERVAL = 3000;
const SYNC_INTERVAL = 10000;

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let herzie: Herzie | null = null;
let pendingMinutes = 0;
let currentNowPlaying: { title: string; artist: string; genre?: string } | null = null;
let currentGenres: string[] = [];

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 380,
    height: 520,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const url = process.env.ELECTRON_RENDERER_URL;
  console.log("Loading renderer from:", url ?? join(__dirname, "../renderer/index.html"));
  if (url) {
    win.loadURL(url);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  win.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error("Failed to load:", code, desc);
  });
  win.webContents.on("console-message", (_e, _level, message) => {
    console.log("[renderer]", message);
  });

  return win;
}

function positionWindowUnderTray(win: BrowserWindow, trayBounds: Electron.Rectangle): void {
  const { x, y, width } = trayBounds;
  const winBounds = win.getBounds();
  const xPos = Math.round(x + width / 2 - winBounds.width / 2);
  const yPos = y + 4;
  win.setPosition(xPos, yPos);
}

function toggleWindow(): void {
  if (!mainWindow) return;

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    if (tray) {
      positionWindowUnderTray(mainWindow, tray.getBounds());
    }
    mainWindow.show();
    mainWindow.focus();
    sendStateToRenderer();
  }
}

function sendStateToRenderer(): void {
  if (!mainWindow || !herzie) return;
  const multipliers = loadMultipliers();
  mainWindow.webContents.send("state-update", {
    herzie,
    nowPlaying: currentNowPlaying,
    multipliers,
    isOnline: isLoggedIn(),
    isConnected: net.isOnline(),
    version: app.getVersion(),
  });
}

// --- Music polling & XP (same logic as CLI daemon) ---

async function poll(): Promise<void> {
  if (!herzie) return;

  const np = await getNowPlaying();

  if (!np || !np.isPlaying || !np.title || np.volume === 0) {
    currentNowPlaying = null;
    currentGenres = [];
    sendStateToRenderer();
    return;
  }

  currentNowPlaying = { title: np.title, artist: np.artist, genre: np.genre };
  currentGenres = np.genre ? [np.genre] : [];

  // Accumulate listening time
  const minutes = POLL_INTERVAL / 60000;
  if (minutes > 0.01) {
    pendingMinutes += minutes;

    const genreList = np.genre ? [np.genre] : [];
    const genres = genreList.length > 0 ? classifyGenre(genreList) : classifyGenre(["pop"]);
    const craving = getDailyCraving(herzie.id);
    const isCraving = genreList.length > 0 && matchesCraving(genreList, craving);

    const xp = calculateXpGain(minutes, herzie.friendCodes.length, isCraving, []);
    const events = applyXp(herzie, xp);
    herzie.totalMinutesListened += minutes;
    recordGenreMinutes(herzie.genreMinutes, genres, minutes);
    saveHerzie(herzie);

    if (events.leveledUp) {
      new Notification({
        title: "Level Up!",
        body: `${herzie.name} is now level ${herzie.level}!`,
      }).show();
    }
    if (events.evolved && events.newStage) {
      new Notification({
        title: "Evolution!",
        body: `${herzie.name} evolved to Stage ${events.newStage}!`,
      }).show();
    }
  }

  sendStateToRenderer();
}

async function syncLoop(): Promise<void> {
  if (!herzie || !isLoggedIn()) return;

  const minutesToSync = Math.min(pendingMinutes, 10);
  const npPayload = currentNowPlaying
    ? { title: currentNowPlaying.title, artist: currentNowPlaying.artist, genre: currentNowPlaying.genre }
    : null;

  const result = await apiSync(npPayload, minutesToSync, currentGenres);

  if (result) {
    pendingMinutes = Math.max(0, pendingMinutes - minutesToSync);

    const s = result.herzie;
    herzie.xp = s.xp;
    herzie.level = s.level;
    herzie.stage = s.stage;
    herzie.totalMinutesListened = s.totalMinutesListened;
    herzie.genreMinutes = s.genreMinutes;
    herzie.friendCodes = s.friendCodes;
    herzie.streakDays = s.streakDays;
    herzie.streakLastDate = s.streakLastDate;
    herzie.currency = s.currency;
    saveHerzie(herzie);
    saveMultipliers(result.multipliers ?? []);

    sendStateToRenderer();
  }
}

// --- App lifecycle ---

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // If a second instance launches, show the existing window
    if (mainWindow) {
      if (tray) positionWindowUnderTray(mainWindow, tray.getBounds());
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.dock?.hide(); // Menu bar only — no dock icon

app.whenReady().then(() => {
  herzie = loadHerzie();
  console.log("Loaded herzie:", herzie?.name ?? "null");

  const iconPath = join(__dirname, "../../resources/iconTemplate.png");
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip("Herzies");
  tray.on("click", toggleWindow);

  mainWindow = createWindow();

  // In dev, show immediately centered and don't hide on blur
  if (!process.env.ELECTRON_RENDERER_URL) {
    mainWindow.on("blur", () => mainWindow?.hide());
  } else {
    mainWindow.center();
    mainWindow.show();
  }

  // IPC handlers
  ipcMain.handle("get-state", () => ({
    herzie,
    nowPlaying: currentNowPlaying,
    multipliers: loadMultipliers(),
    isOnline: isLoggedIn(),
    isConnected: net.isOnline(),
    version: app.getVersion(),
  }));

  // --- Auth ---
  ipcMain.handle("login", async () => {
    const WEB_URL = process.env.HERZIES_WEB_URL ?? "https://www.herzies.app";
    const port = 8974;

    return new Promise<boolean>((resolve) => {
      const server = createServer((req, res) => {
        const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
        if (url.pathname !== "/callback" || req.method !== "POST") { res.writeHead(405).end(); return; }
        let body = "";
        req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        req.on("end", async () => {
          res.writeHead(200, { "Content-Type": "text/html" }).end("<h1>Logged in! You can close this window.</h1>");
          server.close();
          try {
            const params = new URLSearchParams(body);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token") ?? "";
            const expiresIn = parseInt(params.get("expires_in") ?? "3600", 10);
            if (!accessToken) { resolve(false); return; }
            const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString());
            saveSession({
              accessToken,
              refreshToken,
              expiresAt: Date.now() + expiresIn * 1000,
              userId: payload.sub,
            });
            // Sync herzie with server
            const serverHerzie = await apiGetMe();
            if (serverHerzie) {
              herzie = serverHerzie;
              saveHerzie(herzie);
            } else if (herzie) {
              // Local herzie exists but not on server — register it
              await apiRegisterHerzie(herzie);
            }
            sendStateToRenderer();
            resolve(true);
          } catch { resolve(false); }
        });
      });
      server.listen(port, () => {
        shell.openExternal(`${WEB_URL}/auth/cli?port=${port}`);
      });
      // Timeout after 2 minutes
      setTimeout(() => { server.close(); resolve(false); }, 120000);
    });
  });

  ipcMain.handle("logout", () => {
    clearSession();
    sendStateToRenderer();
  });

  // --- Friends ---
  ipcMain.handle("friend-add", async (_e, code: string) => {
    if (!herzie) return { success: false, message: "No herzie" };
    if (!/^HERZ-[A-Z0-9]{4}$/.test(code)) return { success: false, message: "Invalid code format" };
    if (code === herzie.friendCode) return { success: false, message: "Can't add yourself" };
    if (herzie.friendCodes.includes(code)) return { success: false, message: "Already friends" };
    if (herzie.friendCodes.length >= 20) return { success: false, message: "Friend list full (max 20)" };

    const ok = await apiAddFriend(herzie.friendCode, code);
    if (ok) {
      herzie.friendCodes.push(code);
      saveHerzie(herzie);
      sendStateToRenderer();
      return { success: true, message: "Friend added!" };
    }
    return { success: false, message: "Friend code not found" };
  });

  ipcMain.handle("friend-remove", async (_e, code: string) => {
    if (!herzie) return { success: false, message: "No herzie" };
    const idx = herzie.friendCodes.indexOf(code);
    if (idx === -1) return { success: false, message: "Not in friend list" };

    const ok = await apiRemoveFriend(herzie.friendCode, code);
    if (ok) {
      herzie.friendCodes.splice(idx, 1);
      saveHerzie(herzie);
      sendStateToRenderer();
      return { success: true, message: "Friend removed" };
    }
    return { success: false, message: "Failed to remove friend" };
  });

  ipcMain.handle("friend-lookup", async (_e, codes: string[]) => {
    const map = await apiLookupHerzies(codes);
    return Object.fromEntries(map);
  });

  // --- Inventory ---
  ipcMain.handle("fetch-inventory", async () => {
    return await apiFetchInventory();
  });

  ipcMain.handle("sell-item", async (_e, itemId: string, quantity: number) => {
    const result = await apiSellItem(itemId, quantity);
    if (result && herzie) {
      herzie.currency = result.newCurrency;
      saveHerzie(herzie);
      sendStateToRenderer();
    }
    return result;
  });

  // --- Trading ---
  ipcMain.handle("trade-create", async (_e, targetCode: string) => {
    return await apiCreateTrade(targetCode);
  });

  ipcMain.handle("trade-join", async (_e, tradeId: string) => {
    return await apiJoinTrade(tradeId);
  });

  ipcMain.handle("trade-offer", async (_e, tradeId: string, offer: { items: Record<string, number>; currency: number }) => {
    return await apiUpdateTradeOffer(tradeId, offer);
  });

  ipcMain.handle("trade-lock", async (_e, tradeId: string) => {
    return await apiLockTrade(tradeId);
  });

  ipcMain.handle("trade-accept", async (_e, tradeId: string) => {
    return await apiAcceptTrade(tradeId);
  });

  ipcMain.handle("trade-cancel", async (_e, tradeId: string) => {
    return await apiCancelTrade(tradeId);
  });

  ipcMain.handle("trade-poll", async (_e, tradeId: string) => {
    return await apiPollTrade(tradeId);
  });

  // Start loops
  setInterval(() => poll().catch(() => {}), POLL_INTERVAL);
  setInterval(() => syncLoop().catch(() => {}), SYNC_INTERVAL);
  poll().catch(() => {});
  syncLoop().catch(() => {});

  // Auto-start on login
  app.setLoginItemSettings({ openAtLogin: true });
});

app.on("window-all-closed", (e: Event) => {
  e.preventDefault(); // Keep running in menu bar
});
