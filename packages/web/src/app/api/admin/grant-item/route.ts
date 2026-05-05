import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

function verifyAdmin(request: Request): boolean {
	const secret = request.headers.get("x-admin-secret");
	return !!secret && secret === process.env.GAME_ADMIN_SECRET;
}

/** Manually grant an item to a user by name or friend code */
export async function POST(request: Request) {
	if (!verifyAdmin(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	if (!body) {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const { itemId, herzieName, friendCode } = body;

	if (!itemId) {
		return NextResponse.json({ error: "itemId is required" }, { status: 400 });
	}
	if (!herzieName && !friendCode) {
		return NextResponse.json(
			{ error: "herzieName or friendCode is required" },
			{ status: 400 },
		);
	}

	const admin = createAdminClient();

	// Find the herzie
	let query = admin.from("herzies").select("user_id, inventory");
	if (herzieName) {
		query = query.ilike("name", herzieName);
	} else {
		query = query.eq("friend_code", friendCode);
	}

	const { data: herzie } = await query.single();
	if (!herzie) {
		return NextResponse.json({ error: "Herzie not found" }, { status: 404 });
	}

	const inventory: string[] = herzie.inventory ?? [];
	if (inventory.includes(itemId)) {
		return NextResponse.json({ error: "Item already in inventory" }, { status: 409 });
	}

	const { error } = await admin
		.from("herzies")
		.update({ inventory: [...inventory, itemId] })
		.eq("user_id", herzie.user_id);

	if (error) {
		return NextResponse.json({ error: "Failed to grant item" }, { status: 500 });
	}

	return NextResponse.json({ ok: true, itemId });
}
