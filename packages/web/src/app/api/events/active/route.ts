import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { GameEvent } from "@herzies/shared";

export async function GET() {
	const admin = createAdminClient();
	const now = new Date().toISOString();

	const { data, error } = await admin
		.from("events")
		.select("id, type, title, description, active, starts_at, ends_at, config")
		.eq("active", true)
		.lte("starts_at", now)
		.gte("ends_at", now);

	if (error) {
		return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
	}

	// Don't expose secret track details to the client — strip sensitive config
	const events: GameEvent[] = (data ?? []).map((e) => ({
		id: e.id,
		type: e.type,
		title: e.title,
		description: e.description,
		active: e.active,
		startsAt: e.starts_at,
		endsAt: e.ends_at,
		// Only expose non-sensitive config (strip track details for secret_track type)
		config:
			e.type === "secret_track"
				? { rewardItemId: (e.config as Record<string, unknown>).rewardItemId }
				: e.config,
	}));

	return NextResponse.json({ events });
}
