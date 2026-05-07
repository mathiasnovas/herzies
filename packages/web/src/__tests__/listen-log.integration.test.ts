/**
 * Integration tests for listen_log — tracks what users listen to.
 * Requires: `npx supabase start`
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
	createTestUser,
	createTestHerzie,
	cleanupTestData,
	setLocalEnv,
	authenticatedRequest,
	getAdminClient,
} from "./integration-helpers";

import { POST as syncRoute } from "@/app/api/sync/route";

let user: { userId: string; accessToken: string };

beforeAll(async () => {
	setLocalEnv();
	user = await createTestUser();
	await createTestHerzie(user.userId);
}, 10000);

afterAll(async () => {
	const admin = getAdminClient();
	await admin.from("listen_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
	await cleanupTestData();
}, 10000);

async function getListenLog(userId: string) {
	const admin = getAdminClient();
	const { data } = await admin
		.from("listen_log")
		.select("*")
		.eq("user_id", userId)
		.order("listened_at", { ascending: true });
	return data ?? [];
}

async function backdateLastSync(userId: string) {
	const admin = getAdminClient();
	const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
	await admin
		.from("herzies")
		.update({ last_synced_at: tenMinAgo })
		.eq("user_id", userId);
}

describe("Listen log", () => {
	it("logs a track when nowPlaying is sent", async () => {
		await backdateLastSync(user.userId);

		const res = await syncRoute(
			authenticatedRequest("/sync", user.accessToken, {
				nowPlaying: { title: "Bohemian Rhapsody", artist: "Queen", genre: "rock" },
				minutesListened: 3,
				genres: ["rock"],
			}),
		);
		expect(res.status).toBe(200);

		const logs = await getListenLog(user.userId);
		expect(logs.length).toBe(1);
		expect(logs[0].track_name).toBe("Bohemian Rhapsody");
		expect(logs[0].artist_name).toBe("Queen");
		expect(logs[0].source).toBe("cli");
	});

	it("does not log again if the same track is still playing", async () => {
		await backdateLastSync(user.userId);

		const res = await syncRoute(
			authenticatedRequest("/sync", user.accessToken, {
				nowPlaying: { title: "Bohemian Rhapsody", artist: "Queen", genre: "rock" },
				minutesListened: 3,
				genres: ["rock"],
			}),
		);
		expect(res.status).toBe(200);

		const logs = await getListenLog(user.userId);
		// Still 1 — same track, no new entry
		expect(logs.length).toBe(1);
	});

	it("logs a new entry when the track changes", async () => {
		await backdateLastSync(user.userId);

		const res = await syncRoute(
			authenticatedRequest("/sync", user.accessToken, {
				nowPlaying: { title: "Stairway to Heaven", artist: "Led Zeppelin", genre: "rock" },
				minutesListened: 3,
				genres: ["rock"],
			}),
		);
		expect(res.status).toBe(200);

		const logs = await getListenLog(user.userId);
		expect(logs.length).toBe(2);
		expect(logs[1].track_name).toBe("Stairway to Heaven");
		expect(logs[1].artist_name).toBe("Led Zeppelin");
	});

	it("logs another entry when switching back to a previous track", async () => {
		await backdateLastSync(user.userId);

		const res = await syncRoute(
			authenticatedRequest("/sync", user.accessToken, {
				nowPlaying: { title: "Bohemian Rhapsody", artist: "Queen", genre: "rock" },
				minutesListened: 3,
				genres: ["rock"],
			}),
		);
		expect(res.status).toBe(200);

		const logs = await getListenLog(user.userId);
		// Should be 3: Bohemian → Stairway → Bohemian again
		expect(logs.length).toBe(3);
		expect(logs[2].track_name).toBe("Bohemian Rhapsody");
	});

	it("does not log when nowPlaying is null", async () => {
		await backdateLastSync(user.userId);

		// Clear the now_playing first so next sync has null
		const admin = getAdminClient();
		await admin
			.from("herzies")
			.update({ now_playing: null })
			.eq("user_id", user.userId);

		const res = await syncRoute(
			authenticatedRequest("/sync", user.accessToken, {
				nowPlaying: null,
				minutesListened: 0,
				genres: [],
			}),
		);
		expect(res.status).toBe(200);

		const logs = await getListenLog(user.userId);
		// Still 3 — no new entry for null
		expect(logs.length).toBe(3);
	});

	it("RLS prevents anon inserts", async () => {
		const { createClient } = await import("@supabase/supabase-js");
		const anon = createClient(
			"http://127.0.0.1:54321",
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
			{ auth: { autoRefreshToken: false, persistSession: false } },
		);

		const { error } = await anon
			.from("listen_log")
			.insert({
				user_id: user.userId,
				track_name: "Hacked",
				artist_name: "Hacker",
			});

		// Should fail — anon role can't insert
		expect(error).not.toBeNull();
	});
});
