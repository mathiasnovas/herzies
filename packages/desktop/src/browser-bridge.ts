/**
 * Browser-compatible bridge for testing the desktop UI in Chrome.
 * Reads herzie/session from the Vite dev server (which reads ~/.config/herzies/)
 * and calls the herzies API directly.
 */
import type {
	ActiveMultiplier,
	Herzie,
	HerzieProfile,
	Inventory,
	Trade,
} from "@herzies/shared";
import type { AppState } from "./tauri-bridge";

const API_BASE = "https://www.herzies.app/api";

let cachedToken: string | null = null;
let cachedState: AppState | null = null;
const listeners: Array<(state: AppState) => void> = [];

async function loadDevState(): Promise<{
	herzie: Herzie | null;
	session: { access_token: string; user_id: string } | null;
}> {
	const resp = await fetch("/__dev/state");
	return resp.json();
}

async function getToken(): Promise<string | null> {
	if (cachedToken) return cachedToken;
	const { session } = await loadDevState();
	cachedToken = session?.access_token ?? null;
	return cachedToken;
}

async function apiFetch(
	method: string,
	path: string,
	body?: unknown,
): Promise<Response | null> {
	const token = await getToken();
	if (!token) return null;
	const opts: RequestInit = {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
	};
	if (body) opts.body = JSON.stringify(body);
	try {
		return await fetch(`${API_BASE}${path}`, opts);
	} catch {
		return null;
	}
}

function emit(state: AppState) {
	cachedState = state;
	for (const cb of listeners) cb(state);
}

export const herzies = {
	getState: async (): Promise<AppState> => {
		if (cachedState) return cachedState;
		const { herzie } = await loadDevState();
		cachedState = {
			herzie,
			nowPlaying: null,
			multipliers: null,
			isOnline: !!herzie,
			isConnected: true,
			version: "dev-browser",
		};
		return cachedState;
	},

	onStateUpdate: (cb: (state: AppState) => void) => {
		listeners.push(cb);
		return () => {
			const idx = listeners.indexOf(cb);
			if (idx >= 0) listeners.splice(idx, 1);
		};
	},

	login: async () => {
		alert("Login is not supported in browser mode. Run the Tauri app to log in, then refresh this page.");
		return false;
	},
	logout: async () => {},

	friendAdd: async (code: string) => {
		const resp = await apiFetch("POST", "/friends/add", { code });
		if (!resp?.ok) return { success: false, message: "Failed" };
		return { success: true, message: "Friend added!" };
	},
	friendRemove: async (code: string) => {
		const resp = await apiFetch("POST", "/friends/remove", { code });
		if (!resp?.ok) return { success: false, message: "Failed" };
		return { success: true, message: "Friend removed" };
	},
	friendLookup: async (codes: string[]): Promise<Record<string, HerzieProfile>> => {
		const resp = await apiFetch("POST", "/friends/lookup", { codes });
		if (!resp?.ok) return {};
		return resp.json();
	},

	fetchInventory: async (): Promise<{ inventory: Inventory; currency: number } | null> => {
		const resp = await apiFetch("GET", "/inventory");
		if (!resp?.ok) return null;
		return resp.json();
	},
	sellItem: async (itemId: string, quantity: number) => {
		const resp = await apiFetch("POST", "/inventory/sell", { itemId, quantity });
		if (!resp?.ok) return null;
		return resp.json();
	},

	tradeCreate: async (targetCode: string) => {
		const resp = await apiFetch("POST", "/trade/create", { targetFriendCode: targetCode });
		if (!resp?.ok) return null;
		return resp.json();
	},
	tradeJoin: async (tradeId: string) => {
		const resp = await apiFetch("POST", "/trade/join", { tradeId });
		return resp?.ok ?? false;
	},
	tradeOffer: async (tradeId: string, offer: { items: Record<string, number>; currency: number }) => {
		const resp = await apiFetch("POST", "/trade/offer", { tradeId, offer });
		return resp?.ok ?? false;
	},
	tradeLock: async (tradeId: string) => {
		const resp = await apiFetch("POST", "/trade/lock", { tradeId });
		return resp?.ok ?? false;
	},
	tradeAccept: async (tradeId: string) => {
		const resp = await apiFetch("POST", "/trade/accept", { tradeId });
		if (!resp?.ok) return null;
		return resp.json();
	},
	tradeCancel: async (tradeId: string) => {
		const resp = await apiFetch("POST", "/trade/cancel", { tradeId });
		return resp?.ok ?? false;
	},
	tradePoll: async (tradeId: string): Promise<Trade | null> => {
		const resp = await apiFetch("GET", `/trade/${tradeId}`);
		if (!resp?.ok) return null;
		return resp.json();
	},

	testNotification: async () => {
		alert("Test notification (browser mode)");
	},
};
