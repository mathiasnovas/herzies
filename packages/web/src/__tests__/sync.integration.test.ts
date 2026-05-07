/**
 * Integration tests for sync and herzie registration against local Supabase.
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
import { POST as registerHerzie } from "@/app/api/herzie/route";
import { GET as getMe } from "@/app/api/me/route";

let user: { userId: string; accessToken: string };

beforeAll(async () => {
	setLocalEnv();
	user = await createTestUser();
}, 10000);

afterAll(async () => {
	await cleanupTestData();
}, 10000);

describe("Herzie registration", () => {
	it("registers a new herzie", async () => {
		const res = await registerHerzie(
			authenticatedRequest("/herzie", user.accessToken, {
				name: `IT-${Date.now().toString(36)}`,
				appearance: { headIndex: 0, eyesIndex: 0, mouthIndex: 0, accessoryIndex: 0, limbsIndex: 0, bodyIndex: 0, legsIndex: 0, colorScheme: "blue" },
				friendCode: `HERZ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
			}),
		);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.herzie).toBeDefined();
		expect(body.herzie.level).toBe(1);
	});

	it("returns existing herzie on duplicate registration", async () => {
		const res = await registerHerzie(
			authenticatedRequest("/herzie", user.accessToken, {
				name: "ShouldBeIgnored",
				appearance: {},
				friendCode: "HERZ-IGNORED",
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		// Should return the herzie created in the previous test
		expect(body.herzie.name).toMatch(/^IT-/);
	});

	it("GET /me returns the registered herzie", async () => {
		const req = new Request("http://localhost/api/me", {
			method: "GET",
			headers: { Authorization: `Bearer ${user.accessToken}` },
		});
		const res = await getMe(req);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.herzie.name).toMatch(/^IT-/);
	});
});

describe("Sync flow", () => {
	it("syncs with no listening time", async () => {
		const res = await syncRoute(
			authenticatedRequest("/sync", user.accessToken, {
				nowPlaying: null,
				minutesListened: 0,
				genres: [],
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.herzie).toBeDefined();
		expect(body.notifications).toBeDefined();
		expect(body.multipliers).toBeDefined();
	});

	it("grants XP for listening time", async () => {
		// Backdate last_synced_at so the elapsed-time cap allows 5 minutes
		const admin = getAdminClient();
		const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
		await admin
			.from("herzies")
			.update({ last_synced_at: tenMinAgo })
			.eq("user_id", user.userId);

		const res = await syncRoute(
			authenticatedRequest("/sync", user.accessToken, {
				nowPlaying: { title: "Test Song", artist: "Test Artist" },
				minutesListened: 5,
				genres: ["rock"],
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.herzie.xp).toBeGreaterThan(0);
		expect(body.herzie.totalMinutesListened).toBe(5);
	});

	it("grants CDs based on listening time", async () => {
		// Backdate last_synced_at so the elapsed-time cap allows 5 minutes
		const admin = getAdminClient();
		const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
		await admin
			.from("herzies")
			.update({ last_synced_at: tenMinAgo })
			.eq("user_id", user.userId);

		// Sync with enough minutes to earn CDs (10 min = 1 CD)
		// We already have 5 minutes, add 5 more
		const res = await syncRoute(
			authenticatedRequest("/sync", user.accessToken, {
				nowPlaying: { title: "Test Song 2", artist: "Test Artist" },
				minutesListened: 5,
				genres: ["pop"],
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.herzie.totalMinutesListened).toBe(10);

		// Check inventory for CD
		const { data } = await admin
			.from("herzies")
			.select("inventory_v2, cds_granted")
			.eq("user_id", user.userId)
			.single();

		expect(data!.cds_granted).toBe(1);
		expect((data!.inventory_v2 as Record<string, number>).cd).toBeGreaterThanOrEqual(1);
	});

	it("caps minutesListened to elapsed time since last sync", async () => {
		const admin = getAdminClient();

		// Set last_synced_at to 15 seconds ago — above 8s cooldown, so sync is allowed
		const fifteenSecondsAgo = new Date(Date.now() - 15_000).toISOString();
		await admin
			.from("herzies")
			.update({ last_synced_at: fifteenSecondsAgo })
			.eq("user_id", user.userId);

		// Fetch current minutes before sync
		const { data: before } = await admin
			.from("herzies")
			.select("total_minutes_listened")
			.eq("user_id", user.userId)
			.single();

		const minutesBefore = before!.total_minutes_listened as number;

		// Try to claim 10 minutes — should be capped to ~0.33 min (0.25 elapsed + 5s grace)
		const res = await syncRoute(
			authenticatedRequest("/sync", user.accessToken, {
				nowPlaying: { title: "Cheat Song", artist: "Cheat Artist" },
				minutesListened: 10,
				genres: ["rock"],
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();

		// Should have gained at most ~0.33 min (15s elapsed + 5s grace), not 10
		const gained = body.herzie.totalMinutesListened - minutesBefore;
		expect(gained).toBeLessThanOrEqual(0.4);
		expect(gained).toBeGreaterThan(0);
	});

	it("enforces 8-second cooldown between syncs", async () => {
		const admin = getAdminClient();

		// Set last_synced_at to 2 seconds ago — within cooldown window
		const twoSecondsAgo = new Date(Date.now() - 2000).toISOString();
		await admin
			.from("herzies")
			.update({ last_synced_at: twoSecondsAgo })
			.eq("user_id", user.userId);

		const { data: before } = await admin
			.from("herzies")
			.select("total_minutes_listened")
			.eq("user_id", user.userId)
			.single();

		const minutesBefore = before!.total_minutes_listened as number;

		const res = await syncRoute(
			authenticatedRequest("/sync", user.accessToken, {
				nowPlaying: { title: "Rapid Song", artist: "Rapid Artist" },
				minutesListened: 5,
				genres: ["rock"],
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();

		// Should gain 0 minutes due to cooldown
		const gained = body.herzie.totalMinutesListened - minutesBefore;
		expect(gained).toBe(0);
	});

	it("rejects minutesListened > 10 at schema level", async () => {
		const res = await syncRoute(
			authenticatedRequest("/sync", user.accessToken, {
				nowPlaying: null,
				minutesListened: 50,
				genres: [],
			}),
		);
		expect(res.status).toBe(400);
	});

	it("allows first sync without last_synced_at using 10-min cap", async () => {
		// Create a fresh user/herzie with no last_synced_at
		const freshUser = await createTestUser();
		const admin = getAdminClient();

		// Register a herzie for this fresh user
		const regRes = await registerHerzie(
			authenticatedRequest("/herzie", freshUser.accessToken, {
				name: `Fresh-${Date.now().toString(36)}`,
				appearance: { headIndex: 0, eyesIndex: 0, mouthIndex: 0, accessoryIndex: 0, limbsIndex: 0, bodyIndex: 0, legsIndex: 0, colorScheme: "green" },
				friendCode: `HERZ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
			}),
		);
		expect(regRes.status).toBe(201);

		// Sync with 8 minutes — should be accepted (under 10-min hard cap)
		const res = await syncRoute(
			authenticatedRequest("/sync", freshUser.accessToken, {
				nowPlaying: { title: "First Song", artist: "First Artist" },
				minutesListened: 8,
				genres: ["pop"],
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.herzie.totalMinutesListened).toBe(8);
	});

	it("sync does not wipe inventory changes from other operations", async () => {
		const admin = getAdminClient();

		// Manually set inventory to simulate a trade completing
		await admin
			.from("herzies")
			.update({ inventory_v2: { cd: 3, "rare-item": 1 }, currency: 500 })
			.eq("user_id", user.userId);

		// Sync should NOT overwrite currency or inventory
		const res = await syncRoute(
			authenticatedRequest("/sync", user.accessToken, {
				nowPlaying: null,
				minutesListened: 0,
				genres: [],
			}),
		);
		expect(res.status).toBe(200);

		// Verify currency was not reset
		const { data } = await admin
			.from("herzies")
			.select("inventory_v2, currency")
			.eq("user_id", user.userId)
			.single();

		expect(data!.currency).toBe(500);
		expect((data!.inventory_v2 as Record<string, number>)["rare-item"]).toBe(1);
	});
});
