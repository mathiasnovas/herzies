import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { adminEventSchema, parseBody, isParseError } from "@/lib/schemas";

function verifyAdmin(request: Request): boolean {
	const secret = request.headers.get("x-admin-secret");
	return !!secret && secret === process.env.GAME_ADMIN_SECRET;
}

/** List all events */
export async function GET(request: Request) {
	if (!verifyAdmin(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const admin = createAdminClient();
	const { data, error } = await admin
		.from("events")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) {
		return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
	}

	return NextResponse.json({ events: data });
}

/** Create or update an event */
export async function POST(request: Request) {
	if (!verifyAdmin(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await parseBody(request, adminEventSchema);
	if (isParseError(body)) return body;

	const { id, type, title, description, active, startsAt, endsAt, config } = body;

	const admin = createAdminClient();

	// If an event has a rewardItemId, ensure the item exists in the items table
	if (config?.rewardItemId) {
		const { data: existingItem } = await admin
			.from("items")
			.select("id")
			.eq("id", config.rewardItemId as string)
			.single();

		if (!existingItem) {
			// Auto-create the item entry
			await admin.from("items").insert({
				id: config.rewardItemId,
				name: (config.rewardItemName as string) ?? title,
				description: (config.rewardItemDescription as string) ?? `Reward for: ${title}`,
				rarity: (config.rewardItemRarity as string) ?? "legendary",
			});
		}
	}

	if (id) {
		// Update existing event
		const { data, error } = await admin
			.from("events")
			.update({
				type,
				title,
				description: description ?? null,
				active: active ?? true,
				starts_at: startsAt,
				ends_at: endsAt,
				config: config ?? {},
			})
			.eq("id", id)
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
		}
		return NextResponse.json({ event: data });
	}

	// Create new event
	const { data, error } = await admin
		.from("events")
		.insert({
			type,
			title,
			description: description ?? null,
			active: active ?? true,
			starts_at: startsAt,
			ends_at: endsAt,
			config: config ?? {},
		})
		.select()
		.single();

	if (error) {
		return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
	}

	return NextResponse.json({ event: data }, { status: 201 });
}
