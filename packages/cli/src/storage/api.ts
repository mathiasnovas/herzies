/**
 * Game server API client.
 *
 * Routes writes through the game server instead of hitting Supabase directly.
 * The server is the authority for XP, items, and events.
 */

import type {
	Herzie,
	SyncRequest,
	SyncResponse,
	EventNotification,
	GameEvent,
} from "@herzies/shared";
import { loadSession, saveSession } from "./state.js";
import { createClient } from "@supabase/supabase-js";

const API_BASE = process.env.HERZIES_API_URL ?? "https://www.herzies.app/api";

// Supabase credentials for token refresh (same as supabase.ts)
const SUPABASE_URL = "https://ojqfqxolbjegorgoyond.supabase.co";
const SUPABASE_ANON_KEY =
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qcWZxeG9sYmplZ29yZ295b25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjgsImV4cCI6MjA5MzIzMzAyOH0.BBT77VK1ROJr57BJvMfCyra3lbycMA9u2-jxG-LhBJE";

/** Refresh the access token if it's near expiry */
async function ensureFreshToken(): Promise<void> {
	const session = loadSession();
	if (!session?.refreshToken) return;
	if (session.expiresAt > Date.now() + 10 * 60 * 1000) return;

	const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const { data, error } = await sb.auth.refreshSession({
		refresh_token: session.refreshToken,
	});

	if (!error && data.session) {
		saveSession({
			accessToken: data.session.access_token,
			refreshToken: data.session.refresh_token,
			expiresAt: Date.now() + (data.session.expires_in ?? 3600) * 1000,
			userId: session.userId,
		});
	}
}

/** Get the current access token, refreshing if needed */
async function getToken(): Promise<string | null> {
	await ensureFreshToken();
	const session = loadSession();
	return session?.accessToken ?? null;
}

/** Make an authenticated request to the game server */
async function apiFetch(
	path: string,
	options: RequestInit = {},
): Promise<Response> {
	const token = await getToken();
	if (!token) throw new Error("Not logged in");

	return fetch(`${API_BASE}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
			...options.headers,
		},
	});
}

/**
 * Sync heartbeat — sends observations to the game server.
 * Server calculates XP, checks events, and returns authoritative state.
 */
export async function apiSync(
	nowPlaying: { title: string; artist: string; genre?: string } | null,
	minutesListened: number,
	genres: string[],
): Promise<SyncResponse | null> {
	try {
		const body: SyncRequest = { nowPlaying, minutesListened, genres };
		const res = await apiFetch("/sync", {
			method: "POST",
			body: JSON.stringify(body),
		});

		if (!res.ok) return null;
		return (await res.json()) as SyncResponse;
	} catch {
		return null;
	}
}

/** Fetch own herzie from the game server */
export async function apiGetMe(): Promise<Herzie | null> {
	try {
		const res = await apiFetch("/me");
		if (!res.ok) return null;
		const data = await res.json();
		return data.herzie as Herzie;
	} catch {
		return null;
	}
}

/** Add friend via game server (validates ownership server-side) */
export async function apiAddFriend(
	myCode: string,
	theirCode: string,
): Promise<boolean> {
	try {
		const res = await apiFetch("/friends/add", {
			method: "POST",
			body: JSON.stringify({ myCode, theirCode }),
		});
		return res.ok;
	} catch {
		return false;
	}
}

/** Remove friend via game server */
export async function apiRemoveFriend(
	myCode: string,
	theirCode: string,
): Promise<boolean> {
	try {
		const res = await apiFetch("/friends/remove", {
			method: "POST",
			body: JSON.stringify({ myCode, theirCode }),
		});
		return res.ok;
	} catch {
		return false;
	}
}

/** Fetch inventory via game server */
export async function apiFetchInventory(): Promise<string[] | null> {
	try {
		const res = await apiFetch("/inventory");
		if (!res.ok) return null;
		const data = await res.json();
		return data.inventory as string[];
	} catch {
		return null;
	}
}

/** Quick connectivity check */
export async function checkOnline(): Promise<boolean> {
	try {
		const res = await fetch(`${API_BASE}/health`, {
			signal: AbortSignal.timeout(3000),
		});
		return res.ok;
	} catch {
		return false;
	}
}

/** Fetch active events */
export async function apiFetchActiveEvents(): Promise<GameEvent[]> {
	try {
		// This endpoint doesn't require auth
		const res = await fetch(`${API_BASE}/events/active`);
		if (!res.ok) return [];
		const data = await res.json();
		return data.events as GameEvent[];
	} catch {
		return [];
	}
}
