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
		const admin = getAdminClient();
		const { data } = await admin
			.from("herzies")
			.select("inventory_v2, cds_granted")
			.eq("user_id", user.userId)
			.single();

		expect(data!.cds_granted).toBe(1);
		expect((data!.inventory_v2 as Record<string, number>).cd).toBeGreaterThanOrEqual(1);
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
