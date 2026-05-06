import { vi, describe, it, expect, beforeEach } from "vitest";
import { createMockAdmin, fakeRequest, responseJson } from "@/__tests__/helpers";

vi.mock("@/lib/auth", () => ({
	authenticateRequest: vi.fn(),
	isAuthError: (r: unknown) => r instanceof Response,
}));

vi.mock("@/lib/supabase-admin", () => ({
	createAdminClient: vi.fn(),
}));

import { POST } from "./route";
import { authenticateRequest } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

const mockAuth = vi.mocked(authenticateRequest);
const mockAdmin = vi.mocked(createAdminClient);

beforeEach(() => {
	vi.clearAllMocks();
});

describe("POST /api/trade/offer", () => {
	it("returns 401 when unauthenticated", async () => {
		mockAuth.mockResolvedValue(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }));

		const res = await POST(fakeRequest({ tradeId: "t1", offer: { items: {}, currency: 0 } }));
		expect(res.status).toBe(401);
	});

	it("returns 400 on invalid body", async () => {
		mockAuth.mockResolvedValue({ userId: "user-1" });
		mockAdmin.mockReturnValue(createMockAdmin() as never);

		const res = await POST(fakeRequest({ tradeId: "t1" })); // missing offer
		expect(res.status).toBe(400);
	});

	it("returns 404 when trade not found", async () => {
		mockAuth.mockResolvedValue({ userId: "user-1" });
		mockAdmin.mockReturnValue(createMockAdmin({
			trades: { data: null },
		}) as never);

		const res = await POST(fakeRequest({ tradeId: "t1", offer: { items: {}, currency: 0 } }));
		expect(res.status).toBe(404);
	});

	it("returns 403 when not a participant", async () => {
		mockAuth.mockResolvedValue({ userId: "user-3" });
		mockAdmin.mockReturnValue(createMockAdmin({
			trades: { data: { id: "t1", initiator_id: "user-1", target_id: "user-2", state: "active" } },
		}) as never);

		const res = await POST(fakeRequest({ tradeId: "t1", offer: { items: {}, currency: 0 } }));
		expect(res.status).toBe(403);
	});

	it("returns 400 when trade is in wrong state", async () => {
		mockAuth.mockResolvedValue({ userId: "user-1" });
		mockAdmin.mockReturnValue(createMockAdmin({
			trades: { data: { id: "t1", initiator_id: "user-1", target_id: "user-2", state: "pending" } },
		}) as never);

		const res = await POST(fakeRequest({ tradeId: "t1", offer: { items: {}, currency: 0 } }));
		expect(res.status).toBe(400);
		const body = await responseJson(res) as { error: string };
		expect(body.error).toMatch(/pending/);
	});

	it("returns 400 when offering more currency than available", async () => {
		mockAuth.mockResolvedValue({ userId: "user-1" });

		const admin = createMockAdmin();
		let callIndex = 0;
		const originalFrom = admin.from;
		admin.from = vi.fn((table: string) => {
			if (table === "trades") {
				const chain = originalFrom("__empty__");
				(chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
					resolve({ data: { id: "t1", initiator_id: "user-1", target_id: "user-2", state: "active" }, error: null });
				return chain;
			}
			if (table === "herzies") {
				const chain = originalFrom("__empty__");
				(chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
					resolve({ data: { inventory_v2: {}, currency: 50 }, error: null });
				return chain;
			}
			return originalFrom(table);
		}) as typeof admin.from;

		mockAdmin.mockReturnValue(admin as never);

		const res = await POST(fakeRequest({ tradeId: "t1", offer: { items: {}, currency: 100 } }));
		expect(res.status).toBe(400);
		const body = await responseJson(res) as { error: string };
		expect(body.error).toMatch(/currency/i);
	});

	it("returns 400 when offering items not in inventory", async () => {
		mockAuth.mockResolvedValue({ userId: "user-1" });

		const admin = createMockAdmin();
		const originalFrom = admin.from;
		admin.from = vi.fn((table: string) => {
			if (table === "trades") {
				const chain = originalFrom("__empty__");
				(chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
					resolve({ data: { id: "t1", initiator_id: "user-1", target_id: "user-2", state: "active" }, error: null });
				return chain;
			}
			if (table === "herzies") {
				const chain = originalFrom("__empty__");
				(chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
					resolve({ data: { inventory_v2: { cd: 2 }, currency: 100 }, error: null });
				return chain;
			}
			return originalFrom(table);
		}) as typeof admin.from;

		mockAdmin.mockReturnValue(admin as never);

		const res = await POST(fakeRequest({ tradeId: "t1", offer: { items: { cd: 5 }, currency: 0 } }));
		expect(res.status).toBe(400);
		const body = await responseJson(res) as { error: string };
		expect(body.error).toMatch(/cd/);
	});
});
