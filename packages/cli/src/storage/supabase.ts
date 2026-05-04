import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Herzie, HerzieProfile } from "@herzies/shared";
import { loadSession } from "./state.js";

// Public client credentials — anon key is safe to ship, RLS protects the data
const SUPABASE_URL = "https://ojqfqxolbjegorgoyond.supabase.co";
const SUPABASE_ANON_KEY =
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qcWZxeG9sYmplZ29yZ295b25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjgsImV4cCI6MjA5MzIzMzAyOH0.BBT77VK1ROJr57BJvMfCyra3lbycMA9u2-jxG-LhBJE";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
	if (!client) {
		const session = loadSession();
		client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			auth: {
				autoRefreshToken: true,
				persistSession: false,
			},
			global: {
				headers: session?.accessToken
					? { Authorization: `Bearer ${session.accessToken}` }
					: {},
			},
		});
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
		const { error } = await getSupabase().from("herzies").upsert(
			{
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
			},
			{ onConflict: "user_id" },
		);
		return !error;
	} catch {
		return false;
	}
}

/** Check if a herzie name is already taken */
export async function isNameTaken(name: string): Promise<boolean> {
	try {
		const { data } = await getSupabase()
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
	const session = loadSession();
	if (!session) return false;
	try {
		const { error } = await getSupabase()
			.from("herzies")
			.delete()
			.eq("user_id", session.userId);
		return !error;
	} catch {
		return false;
	}
}

/** Look up a Herzie by friend code (public, no auth needed) */
export async function lookupHerzie(
	friendCode: string,
): Promise<HerzieProfile | null> {
	try {
		const { data, error } = await getSupabase()
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
		await getSupabase().rpc("add_friend", {
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
		await getSupabase().rpc("remove_friend", {
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
		const { data, error } = await getSupabase()
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
