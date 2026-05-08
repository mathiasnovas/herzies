let electron = require("electron");
let node_http = require("node:http");
let node_url = require("node:url");
let node_path = require("node:path");
let node_child_process = require("node:child_process");
let node_crypto = require("node:crypto");
let node_fs = require("node:fs");
let node_os = require("node:os");
let _herzies_shared = require("@herzies/shared");
//#region src/main/nowplaying.ts
/** Query the currently playing track from known macOS music apps via osascript */
async function getNowPlaying() {
	return await tryMusic() ?? await trySpotify() ?? null;
}
function tryMusic() {
	return queryApp("Music", `
		tell application "System Events"
			if not (exists process "Music") then return "NOT_RUNNING"
		end tell
		tell application "Music"
			if player state is not playing then return "NOT_PLAYING"
			set t to name of current track
			set a to artist of current track
			set al to album of current track
			set g to genre of current track
			set d to duration of current track
			set p to player position
			set v to sound volume
			return t & "||" & a & "||" & al & "||" & g & "||" & d & "||" & p & "||" & v
		end tell
	`, "Music");
}
function trySpotify() {
	return queryApp("Spotify", `
		tell application "System Events"
			if not (exists process "Spotify") then return "NOT_RUNNING"
		end tell
		tell application "Spotify"
			if player state is not playing then return "NOT_PLAYING"
			set u to spotify url of current track
			if u starts with "spotify:ad:" then return "NOT_PLAYING"
			set t to name of current track
			set a to artist of current track
			set al to album of current track
			set d to (duration of current track) / 1000
			set p to player position
			set v to sound volume
			return t & "||" & a & "||" & al & "||" & "||" & d & "||" & p & "||" & v
		end tell
	`, "Spotify");
}
function queryApp(_appName, script, source) {
	return new Promise((resolve) => {
		(0, node_child_process.execFile)("osascript", ["-e", script], { timeout: 5e3 }, (error, stdout) => {
			if (error) {
				resolve(null);
				return;
			}
			const result = stdout.trim();
			if (result === "NOT_RUNNING" || result === "NOT_PLAYING") {
				resolve(null);
				return;
			}
			const parts = result.split("||");
			if (parts.length < 7) {
				resolve(null);
				return;
			}
			resolve({
				title: parts[0],
				artist: parts[1],
				album: parts[2],
				genre: parts[3],
				duration: Number.parseFloat(parts[4]) || 0,
				elapsed: Number.parseFloat(parts[5]) || 0,
				isPlaying: true,
				source,
				volume: Number.parseInt(parts[6], 10) || 0
			});
		});
	});
}
//#endregion
//#region src/main/storage.ts
var CONFIG_DIR = (0, node_path.join)((0, node_os.homedir)(), ".config", "herzies");
var HERZIE_FILE = (0, node_path.join)(CONFIG_DIR, "herzie.json");
var SESSION_FILE = (0, node_path.join)(CONFIG_DIR, "session.json");
var MULTIPLIERS_FILE = (0, node_path.join)(CONFIG_DIR, "multipliers.json");
(0, node_path.join)(CONFIG_DIR, "pending-trade.json");
(0, node_path.join)(CONFIG_DIR, "notifications.json");
function ensureDir() {
	if (!(0, node_fs.existsSync)(CONFIG_DIR)) (0, node_fs.mkdirSync)(CONFIG_DIR, {
		recursive: true,
		mode: 448
	});
}
function writeSecure(path, data) {
	(0, node_fs.writeFileSync)(path, data);
	(0, node_fs.chmodSync)(path, 384);
}
var HMAC_SALT = "hrzs_v1_8f3a2c";
/** Compute HMAC over the cheat-sensitive fields of a herzie */
function computeSignature(herzie) {
	const payload = JSON.stringify({
		id: herzie.id,
		xp: herzie.xp,
		level: herzie.level,
		stage: herzie.stage,
		totalMinutesListened: herzie.totalMinutesListened,
		genreMinutes: herzie.genreMinutes,
		currency: herzie.currency
	});
	return (0, node_crypto.createHmac)("sha256", `${HMAC_SALT}:${herzie.id}`).update(payload).digest("hex");
}
function loadHerzie() {
	ensureDir();
	if (!(0, node_fs.existsSync)(HERZIE_FILE)) return null;
	try {
		const { _sig, ...herzie } = JSON.parse((0, node_fs.readFileSync)(HERZIE_FILE, "utf-8"));
		if (!_sig || _sig !== computeSignature(herzie)) {
			herzie.xp = 0;
			herzie.level = 1;
			herzie.stage = 1;
			herzie.totalMinutesListened = 0;
			herzie.genreMinutes = {};
		}
		return herzie;
	} catch {
		return null;
	}
}
function saveHerzie(herzie) {
	ensureDir();
	const data = {
		...herzie,
		_sig: computeSignature(herzie)
	};
	writeSecure(HERZIE_FILE, JSON.stringify(data, null, 2));
}
function loadSession() {
	ensureDir();
	if (!(0, node_fs.existsSync)(SESSION_FILE)) return null;
	try {
		const data = JSON.parse((0, node_fs.readFileSync)(SESSION_FILE, "utf-8"));
		if (!data?.accessToken || !data?.userId) return null;
		return data;
	} catch {
		return null;
	}
}
function saveSession(session) {
	ensureDir();
	writeSecure(SESSION_FILE, JSON.stringify(session, null, 2));
}
function clearSession() {
	ensureDir();
	if ((0, node_fs.existsSync)(SESSION_FILE)) writeSecure(SESSION_FILE, "{}");
}
function saveMultipliers(multipliers) {
	ensureDir();
	writeSecure(MULTIPLIERS_FILE, JSON.stringify(multipliers));
}
function loadMultipliers() {
	if (!(0, node_fs.existsSync)(MULTIPLIERS_FILE)) return null;
	try {
		return JSON.parse((0, node_fs.readFileSync)(MULTIPLIERS_FILE, "utf-8"));
	} catch {
		return null;
	}
}
//#endregion
//#region src/main/api.ts
var API_BASE = process.env.HERZIES_API_URL ?? "https://www.herzies.app/api";
/** Refresh the access token if it's near expiry */
async function ensureFreshToken() {
	const session = loadSession();
	if (!session?.refreshToken) return;
	if (session.expiresAt > Date.now() + 600 * 1e3) return;
	try {
		const res = await fetch(`${API_BASE}/auth/refresh`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ refreshToken: session.refreshToken })
		});
		if (!res.ok) return;
		const data = await res.json();
		saveSession({
			accessToken: data.accessToken,
			refreshToken: data.refreshToken,
			expiresAt: Date.now() + (data.expiresIn ?? 3600) * 1e3,
			userId: session.userId
		});
	} catch {}
}
/** Get the current access token, refreshing if needed */
async function getToken() {
	await ensureFreshToken();
	return loadSession()?.accessToken ?? null;
}
/** Make an authenticated request to the game server */
async function apiFetch(path, options = {}) {
	const token = await getToken();
	if (!token) throw new Error("Not logged in");
	return fetch(`${API_BASE}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
			...options.headers
		}
	});
}
/** Check if the user is logged in */
function isLoggedIn() {
	return loadSession() !== null;
}
/**
* Sync heartbeat — sends observations to the game server.
* Server calculates XP, checks events, and returns authoritative state.
*/
async function apiSync(nowPlaying, minutesListened, genres) {
	try {
		const res = await apiFetch("/sync", {
			method: "POST",
			body: JSON.stringify({
				nowPlaying,
				minutesListened,
				genres
			})
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}
/** Register a local herzie with the game server (creates DB row) */
async function apiRegisterHerzie(herzie) {
	try {
		const res = await apiFetch("/herzie", {
			method: "POST",
			body: JSON.stringify({
				name: herzie.name,
				appearance: herzie.appearance,
				friendCode: herzie.friendCode
			})
		});
		if (!res.ok) return null;
		return (await res.json()).herzie;
	} catch {
		return null;
	}
}
/** Fetch own herzie from the game server */
async function apiGetMe() {
	try {
		const res = await apiFetch("/me");
		if (!res.ok) return null;
		return (await res.json()).herzie;
	} catch {
		return null;
	}
}
/** Add friend via game server (validates ownership server-side) */
async function apiAddFriend(myCode, theirCode) {
	try {
		return (await apiFetch("/friends/add", {
			method: "POST",
			body: JSON.stringify({
				myCode,
				theirCode
			})
		})).ok;
	} catch {
		return false;
	}
}
/** Remove friend via game server */
async function apiRemoveFriend(myCode, theirCode) {
	try {
		return (await apiFetch("/friends/remove", {
			method: "POST",
			body: JSON.stringify({
				myCode,
				theirCode
			})
		})).ok;
	} catch {
		return false;
	}
}
/** Fetch inventory via game server */
async function apiFetchInventory() {
	try {
		const res = await apiFetch("/inventory");
		if (!res.ok) return null;
		const data = await res.json();
		return {
			inventory: data.inventory,
			currency: data.currency ?? 0
		};
	} catch {
		return null;
	}
}
/** Sell items for currency */
async function apiSellItem(itemId, quantity) {
	try {
		const res = await apiFetch("/inventory/sell", {
			method: "POST",
			body: JSON.stringify({
				itemId,
				quantity
			})
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}
/** Create a trade request */
async function apiCreateTrade(targetFriendCode) {
	try {
		const res = await apiFetch("/trade/create", {
			method: "POST",
			body: JSON.stringify({ targetFriendCode })
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}
/** Join a pending trade */
async function apiJoinTrade(tradeId) {
	try {
		return (await apiFetch("/trade/join", {
			method: "POST",
			body: JSON.stringify({ tradeId })
		})).ok;
	} catch {
		return false;
	}
}
/** Update your trade offer */
async function apiUpdateTradeOffer(tradeId, offer) {
	try {
		return (await apiFetch("/trade/offer", {
			method: "POST",
			body: JSON.stringify({
				tradeId,
				offer
			})
		})).ok;
	} catch {
		return false;
	}
}
/** Lock your side of the trade */
async function apiLockTrade(tradeId) {
	try {
		return (await apiFetch("/trade/lock", {
			method: "POST",
			body: JSON.stringify({ tradeId })
		})).ok;
	} catch {
		return false;
	}
}
/** Accept the trade (after both locked) */
async function apiAcceptTrade(tradeId) {
	try {
		const res = await apiFetch("/trade/accept", {
			method: "POST",
			body: JSON.stringify({ tradeId })
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}
/** Cancel a trade */
async function apiCancelTrade(tradeId) {
	try {
		return (await apiFetch("/trade/cancel", {
			method: "POST",
			body: JSON.stringify({ tradeId })
		})).ok;
	} catch {
		return false;
	}
}
/** Poll trade status */
async function apiPollTrade(tradeId) {
	try {
		const res = await apiFetch(`/trade/status?tradeId=${encodeURIComponent(tradeId)}`);
		if (!res.ok) return null;
		return (await res.json()).trade;
	} catch {
		return null;
	}
}
/** Look up multiple herzies by friend codes (public, no auth needed) */
async function apiLookupHerzies(friendCodes) {
	const result = /* @__PURE__ */ new Map();
	if (friendCodes.length === 0) return result;
	try {
		const res = await fetch(`${API_BASE}/lookup?codes=${encodeURIComponent(friendCodes.join(","))}`);
		if (!res.ok) return result;
		const data = await res.json();
		for (const h of data.herzies ?? []) result.set(h.friendCode, h);
	} catch {}
	return result;
}
//#endregion
//#region src/main/index.ts
var POLL_INTERVAL = 3e3;
var SYNC_INTERVAL = 1e4;
var tray = null;
var mainWindow = null;
var herzie = null;
var pendingMinutes = 0;
var currentNowPlaying = null;
var currentGenres = [];
function createWindow() {
	const win = new electron.BrowserWindow({
		width: 380,
		height: 520,
		show: false,
		frame: false,
		resizable: false,
		skipTaskbar: true,
		webPreferences: {
			preload: (0, node_path.join)(__dirname, "../preload/index.js"),
			contextIsolation: true,
			nodeIntegration: false
		}
	});
	const url = process.env.ELECTRON_RENDERER_URL;
	console.log("Loading renderer from:", url ?? (0, node_path.join)(__dirname, "../renderer/index.html"));
	if (url) {
		win.loadURL(url);
		win.webContents.openDevTools({ mode: "detach" });
	} else win.loadFile((0, node_path.join)(__dirname, "../renderer/index.html"));
	win.webContents.on("did-fail-load", (_e, code, desc) => {
		console.error("Failed to load:", code, desc);
	});
	win.webContents.on("console-message", (_e, _level, message) => {
		console.log("[renderer]", message);
	});
	return win;
}
function positionWindowUnderTray(win, trayBounds) {
	const { x, y, width } = trayBounds;
	const winBounds = win.getBounds();
	const xPos = Math.round(x + width / 2 - winBounds.width / 2);
	const yPos = y + 4;
	win.setPosition(xPos, yPos);
}
function toggleWindow() {
	if (!mainWindow) return;
	if (mainWindow.isVisible()) mainWindow.hide();
	else {
		if (tray) positionWindowUnderTray(mainWindow, tray.getBounds());
		mainWindow.show();
		mainWindow.focus();
		sendStateToRenderer();
	}
}
function sendStateToRenderer() {
	if (!mainWindow || !herzie) return;
	const multipliers = loadMultipliers();
	mainWindow.webContents.send("state-update", {
		herzie,
		nowPlaying: currentNowPlaying,
		multipliers,
		isOnline: isLoggedIn(),
		isConnected: electron.net.isOnline(),
		version: electron.app.getVersion()
	});
}
async function poll() {
	if (!herzie) return;
	const np = await getNowPlaying();
	if (!np || !np.isPlaying || !np.title || np.volume === 0) {
		currentNowPlaying = null;
		currentGenres = [];
		sendStateToRenderer();
		return;
	}
	currentNowPlaying = {
		title: np.title,
		artist: np.artist,
		genre: np.genre
	};
	currentGenres = np.genre ? [np.genre] : [];
	const minutes = POLL_INTERVAL / 6e4;
	if (minutes > .01) {
		pendingMinutes += minutes;
		const genreList = np.genre ? [np.genre] : [];
		const genres = genreList.length > 0 ? (0, _herzies_shared.classifyGenre)(genreList) : (0, _herzies_shared.classifyGenre)(["pop"]);
		const craving = (0, _herzies_shared.getDailyCraving)(herzie.id);
		const isCraving = genreList.length > 0 && (0, _herzies_shared.matchesCraving)(genreList, craving);
		const xp = (0, _herzies_shared.calculateXpGain)(minutes, herzie.friendCodes.length, isCraving, []);
		const events = (0, _herzies_shared.applyXp)(herzie, xp);
		herzie.totalMinutesListened += minutes;
		(0, _herzies_shared.recordGenreMinutes)(herzie.genreMinutes, genres, minutes);
		saveHerzie(herzie);
		if (events.leveledUp) new electron.Notification({
			title: "Level Up!",
			body: `${herzie.name} is now level ${herzie.level}!`
		}).show();
		if (events.evolved && events.newStage) new electron.Notification({
			title: "Evolution!",
			body: `${herzie.name} evolved to Stage ${events.newStage}!`
		}).show();
	}
	sendStateToRenderer();
}
async function syncLoop() {
	if (!herzie || !isLoggedIn()) return;
	const minutesToSync = Math.min(pendingMinutes, 10);
	const result = await apiSync(currentNowPlaying ? {
		title: currentNowPlaying.title,
		artist: currentNowPlaying.artist,
		genre: currentNowPlaying.genre
	} : null, minutesToSync, currentGenres);
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
if (!electron.app.requestSingleInstanceLock()) electron.app.quit();
else electron.app.on("second-instance", () => {
	if (mainWindow) {
		if (tray) positionWindowUnderTray(mainWindow, tray.getBounds());
		mainWindow.show();
		mainWindow.focus();
	}
});
electron.app.dock?.hide();
electron.app.whenReady().then(() => {
	herzie = loadHerzie();
	console.log("Loaded herzie:", herzie?.name ?? "null");
	const iconPath = (0, node_path.join)(__dirname, "../../resources/iconTemplate.png");
	const icon = electron.nativeImage.createFromPath(iconPath);
	icon.setTemplateImage(true);
	tray = new electron.Tray(icon);
	tray.setToolTip("Herzies");
	tray.on("click", toggleWindow);
	mainWindow = createWindow();
	if (!process.env.ELECTRON_RENDERER_URL) mainWindow.on("blur", () => mainWindow?.hide());
	else {
		mainWindow.center();
		mainWindow.show();
	}
	electron.ipcMain.handle("get-state", () => ({
		herzie,
		nowPlaying: currentNowPlaying,
		multipliers: loadMultipliers(),
		isOnline: isLoggedIn(),
		isConnected: electron.net.isOnline(),
		version: electron.app.getVersion()
	}));
	electron.ipcMain.handle("login", async () => {
		const WEB_URL = process.env.HERZIES_WEB_URL ?? "https://www.herzies.app";
		const port = 8974;
		return new Promise((resolve) => {
			const server = (0, node_http.createServer)((req, res) => {
				if (new node_url.URL(req.url ?? "/", `http://${req.headers.host}`).pathname !== "/callback" || req.method !== "POST") {
					res.writeHead(405).end();
					return;
				}
				let body = "";
				req.on("data", (chunk) => {
					body += chunk.toString();
				});
				req.on("end", async () => {
					res.writeHead(200, { "Content-Type": "text/html" }).end("<h1>Logged in! You can close this window.</h1>");
					server.close();
					try {
						const params = new URLSearchParams(body);
						const accessToken = params.get("access_token");
						const refreshToken = params.get("refresh_token") ?? "";
						const expiresIn = parseInt(params.get("expires_in") ?? "3600", 10);
						if (!accessToken) {
							resolve(false);
							return;
						}
						const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString());
						saveSession({
							accessToken,
							refreshToken,
							expiresAt: Date.now() + expiresIn * 1e3,
							userId: payload.sub
						});
						const serverHerzie = await apiGetMe();
						if (serverHerzie) {
							herzie = serverHerzie;
							saveHerzie(herzie);
						} else if (herzie) await apiRegisterHerzie(herzie);
						sendStateToRenderer();
						resolve(true);
					} catch {
						resolve(false);
					}
				});
			});
			server.listen(port, () => {
				electron.shell.openExternal(`${WEB_URL}/auth/cli?port=${port}`);
			});
			setTimeout(() => {
				server.close();
				resolve(false);
			}, 12e4);
		});
	});
	electron.ipcMain.handle("logout", () => {
		clearSession();
		sendStateToRenderer();
	});
	electron.ipcMain.handle("friend-add", async (_e, code) => {
		if (!herzie) return {
			success: false,
			message: "No herzie"
		};
		if (!/^HERZ-[A-Z0-9]{4}$/.test(code)) return {
			success: false,
			message: "Invalid code format"
		};
		if (code === herzie.friendCode) return {
			success: false,
			message: "Can't add yourself"
		};
		if (herzie.friendCodes.includes(code)) return {
			success: false,
			message: "Already friends"
		};
		if (herzie.friendCodes.length >= 20) return {
			success: false,
			message: "Friend list full (max 20)"
		};
		if (await apiAddFriend(herzie.friendCode, code)) {
			herzie.friendCodes.push(code);
			saveHerzie(herzie);
			sendStateToRenderer();
			return {
				success: true,
				message: "Friend added!"
			};
		}
		return {
			success: false,
			message: "Friend code not found"
		};
	});
	electron.ipcMain.handle("friend-remove", async (_e, code) => {
		if (!herzie) return {
			success: false,
			message: "No herzie"
		};
		const idx = herzie.friendCodes.indexOf(code);
		if (idx === -1) return {
			success: false,
			message: "Not in friend list"
		};
		if (await apiRemoveFriend(herzie.friendCode, code)) {
			herzie.friendCodes.splice(idx, 1);
			saveHerzie(herzie);
			sendStateToRenderer();
			return {
				success: true,
				message: "Friend removed"
			};
		}
		return {
			success: false,
			message: "Failed to remove friend"
		};
	});
	electron.ipcMain.handle("friend-lookup", async (_e, codes) => {
		const map = await apiLookupHerzies(codes);
		return Object.fromEntries(map);
	});
	electron.ipcMain.handle("fetch-inventory", async () => {
		return await apiFetchInventory();
	});
	electron.ipcMain.handle("sell-item", async (_e, itemId, quantity) => {
		const result = await apiSellItem(itemId, quantity);
		if (result && herzie) {
			herzie.currency = result.newCurrency;
			saveHerzie(herzie);
			sendStateToRenderer();
		}
		return result;
	});
	electron.ipcMain.handle("trade-create", async (_e, targetCode) => {
		return await apiCreateTrade(targetCode);
	});
	electron.ipcMain.handle("trade-join", async (_e, tradeId) => {
		return await apiJoinTrade(tradeId);
	});
	electron.ipcMain.handle("trade-offer", async (_e, tradeId, offer) => {
		return await apiUpdateTradeOffer(tradeId, offer);
	});
	electron.ipcMain.handle("trade-lock", async (_e, tradeId) => {
		return await apiLockTrade(tradeId);
	});
	electron.ipcMain.handle("trade-accept", async (_e, tradeId) => {
		return await apiAcceptTrade(tradeId);
	});
	electron.ipcMain.handle("trade-cancel", async (_e, tradeId) => {
		return await apiCancelTrade(tradeId);
	});
	electron.ipcMain.handle("trade-poll", async (_e, tradeId) => {
		return await apiPollTrade(tradeId);
	});
	setInterval(() => poll().catch(() => {}), POLL_INTERVAL);
	setInterval(() => syncLoop().catch(() => {}), SYNC_INTERVAL);
	poll().catch(() => {});
	syncLoop().catch(() => {});
	electron.app.setLoginItemSettings({ openAtLogin: true });
});
electron.app.on("window-all-closed", (e) => {
	e.preventDefault();
});
//#endregion
