import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Herzie, HerzieProfile } from "@herzies/shared";
import { loadSession, saveSession, saveHerzie } from "./state.js";
import { generateFriendCode } from "../core/friends.js";

// Public client credentials — anon key is safe to ship, RLS protects the data
const SUPABASE_URL = "https://ojqfqxolbjegorgoyond.supabase.co";
const SUPABASE_ANON_KEY =
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qcWZxeG9sYmplZ29yZ295b25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjgsImV4cCI6MjA5MzIzMzAyOH0.BBT77VK1ROJr57BJvMfCyra3lbycMA9u2-jxG-LhBJE";

let client: SupabaseClient | null = null;
let clientToken: string | undefined;

/** Refresh the access token if it's expired, using the stored refresh token */
async function ensureFreshToken(): Promise<void> {
	const session = loadSession();
	if (!session?.refreshToken) return;

	// Refresh if token expires within the next 5 minutes
	if (session.expiresAt > Date.now() + 5 * 60 * 1000) return;

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
		// Force client recreation with new token
		client = null;
	}
}

export async function getSupabase(): Promise<SupabaseClient> {
	const session = loadSession();
	const token = session?.accessToken;

	// Recreate client if token has changed (login/logout/switch account)
	if (!client || token !== clientToken) {
		clientToken = token;
		client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		});
		if (token && session?.refreshToken) {
			await client.auth.setSession({
				access_token: token,
				refresh_token: session.refreshToken,
			});
		}
	}
	return client;
}

/** Check if the user is logged in */
export function isLoggedIn(): boolean {
	return loadSession() !== null;
}

/** Sync a full Herzie to the server. Requires login. */
export async function syncHerzie(herzie: Herzie): Promise<boolean> {
	const session = loadSession();
	if (!session) return false;
	try {
		await ensureFreshToken();
		const upsertData = () => ({
			user_id: session.userId,
			friend_code: herzie.friendCode,
			name: herzie.name,
			stage: herzie.stage,
			level: herzie.level,
			xp: Math.floor(herzie.xp),
			appearance: herzie.appearance,
			total_minutes_listened: herzie.totalMinutesListened,
			genre_minutes: herzie.genreMinutes,
			friend_codes: herzie.friendCodes,
			last_craving_date: herzie.lastCravingDate,
			last_craving_genre: herzie.lastCravingGenre,
		});

		const sb = await getSupabase();
		const { error } = await sb
			.from("herzies")
			.upsert(upsertData(), { onConflict: "user_id" });

		// unique constraint conflict — regenerate the conflicting field and retry
		if (error?.code === "23505") {
			if (error.message.includes("friend_code")) {
				herzie.friendCode = generateFriendCode();
			}
			if (error.message.includes("name")) {
				herzie.name = `${herzie.name}-${herzie.friendCode.slice(-4)}`;
			}
			saveHerzie(herzie);
			const { error: retryError } = await sb
				.from("herzies")
				.upsert(upsertData(), { onConflict: "user_id" });
			return !retryError;
		}

		return !error;
	} catch {
		return false;
	}
}

/** Check if a herzie name is already taken */
export async function isNameTaken(name: string): Promise<boolean> {
	try {
		const { data } = await (await getSupabase())
			.from("herzies")
			.select("name")
			.ilike("name", name)
			.limit(1);
		return (data?.length ?? 0) > 0;
	} catch {
		return false;
	}
}

/** Delete the user's herzie from Supabase. Requires login. */
export async function deleteHerzie(): Promise<boolean> {
	if (!loadSession()) return false;
	try {
		await ensureFreshToken();
		// Re-read session after potential refresh
		const session = loadSession();
		if (!session) return false;

		const sb = await getSupabase();

		// Debug: verify auth state
		const { data: authData } = await sb.auth.getUser();
		console.error(`debug: auth.uid = ${authData?.user?.id ?? "null"}, session.userId = ${session.userId}`);

		const result = await sb
			.from("herzies")
			.delete({ count: "exact" })
			.eq("user_id", session.userId);
		console.error(`debug: delete result:`, JSON.stringify({ error: result.error, count: result.count, status: result.status, statusText: result.statusText }));
		return !result.error;
	} catch (err) {
		console.error(`Supabase delete exception: ${err}`);
		return false;
	}
}

/** Look up a Herzie by friend code (public, no auth needed) */
export async function lookupHerzie(
	friendCode: string,
): Promise<HerzieProfile | null> {
	try {
		const { data, error } = await (await getSupabase())
			.from("herzies")
			.select("name, friend_code, stage, level")
			.eq("friend_code", friendCode)
			.single();
		if (error || !data) return null;
		return {
			name: data.name,
			friendCode: data.friend_code,
			stage: data.stage,
			level: data.level,
		};
	} catch {
		return null;
	}
}

/** Add my friend code to another herzie's friend list (bidirectional) */
export async function addFriendRemote(myCode: string, theirCode: string): Promise<void> {
	try {
		await (await getSupabase()).rpc("add_friend", {
			my_friend_code: myCode,
			their_friend_code: theirCode,
		});
	} catch {
		// Best-effort — friend still gets added locally
	}
}

/** Remove my friend code from another herzie's friend list */
export async function removeFriendRemote(myCode: string, theirCode: string): Promise<void> {
	try {
		await (await getSupabase()).rpc("remove_friend", {
			my_friend_code: myCode,
			their_friend_code: theirCode,
		});
	} catch {
		// Best-effort
	}
}

/** Look up multiple Herzies by friend codes (public, no auth needed) */
export async function lookupHerzies(
	friendCodes: string[],
): Promise<Map<string, HerzieProfile>> {
	const result = new Map<string, HerzieProfile>();
	if (friendCodes.length === 0) return result;
	try {
		const { data, error } = await (await getSupabase())
			.from("herzies")
			.select("name, friend_code, stage, level")
			.in("friend_code", friendCodes);
		if (error || !data) return result;
		for (const row of data) {
			result.set(row.friend_code, {
				name: row.name,
				friendCode: row.friend_code,
				stage: row.stage,
				level: row.level,
			});
		}
	} catch {
		// Graceful degradation — works offline
	}
	return result;
}
