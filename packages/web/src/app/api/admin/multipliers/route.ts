import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

function verifyAdmin(request: Request): boolean {
	const secret = request.headers.get("x-admin-secret");
	return !!secret && secret === process.env.GAME_ADMIN_SECRET;
}

/** List all multipliers */
export async function GET(request: Request) {
	if (!verifyAdmin(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const admin = createAdminClient();
	const { data, error } = await admin
		.from("multipliers")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) {
		return NextResponse.json({ error: "Failed to fetch multipliers" }, { status: 500 });
	}

	return NextResponse.json({ multipliers: data });
}

/** Create or update a multiplier */
export async function POST(request: Request) {
	if (!verifyAdmin(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	if (!body) {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const { id, name, bonus, active, startsAt, endsAt, schedule } = body;

	if (!name || typeof bonus !== "number" || !startsAt || !endsAt) {
		return NextResponse.json(
			{ error: "name, bonus, startsAt, and endsAt are required" },
			{ status: 400 },
		);
	}

	const row = {
		name,
		bonus,
		active: active ?? true,
		starts_at: startsAt,
		ends_at: endsAt,
		schedule: schedule ?? null,
	};

	const admin = createAdminClient();

	if (id) {
		const { data, error } = await admin
			.from("multipliers")
			.update(row)
			.eq("id", id)
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: "Failed to update multiplier" }, { status: 500 });
		}
		return NextResponse.json({ multiplier: data });
	}

	const { data, error } = await admin
		.from("multipliers")
		.insert(row)
		.select()
		.single();

	if (error) {
		return NextResponse.json({ error: "Failed to create multiplier" }, { status: 500 });
	}

	return NextResponse.json({ multiplier: data }, { status: 201 });
}

/** Delete a multiplier */
export async function DELETE(request: Request) {
	if (!verifyAdmin(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");

	if (!id) {
		return NextResponse.json({ error: "id query param is required" }, { status: 400 });
	}

	const admin = createAdminClient();
	const { error } = await admin.from("multipliers").delete().eq("id", id);

	if (error) {
		return NextResponse.json({ error: "Failed to delete multiplier" }, { status: 500 });
	}

	return NextResponse.json({ ok: true });
}
