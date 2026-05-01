import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { HerzieProfile } from "@herzies/shared";
import { loadSession } from "./state.js";

const SUPABASE_URL = process.env.HERZIES_SUPABASE_URL ?? "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.HERZIES_SUPABASE_ANON_KEY ?? "";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
	if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
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

export function isOnline(): boolean {
	return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}

/** Register or update a Herzie in the online registry */
export async function registerHerzie(profile: HerzieProfile): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) return false;
	try {
		const { error } = await sb.from("herzies").upsert(
			{
				friend_code: profile.friendCode,
				name: profile.name,
				stage: profile.stage,
				level: profile.level,
			},
			{ onConflict: "friend_code" },
		);
		return !error;
	} catch {
		return false;
	}
}

/** Look up a Herzie by friend code */
export async function lookupHerzie(
	friendCode: string,
): Promise<HerzieProfile | null> {
	const sb = getSupabase();
	if (!sb) return null;
	try {
		const { data, error } = await sb
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

/** Look up multiple Herzies by friend codes */
export async function lookupHerzies(
	friendCodes: string[],
): Promise<Map<string, HerzieProfile>> {
	const result = new Map<string, HerzieProfile>();
	const sb = getSupabase();
	if (!sb || friendCodes.length === 0) return result;
	try {
		const { data, error } = await sb
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
		// Graceful degradation
	}
	return result;
}
