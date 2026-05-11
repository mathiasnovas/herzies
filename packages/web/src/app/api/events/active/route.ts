import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { GameEvent, SongHuntConfig, SongHuntFinder } from "@herzies/shared";

function garbleText(text: string, seed: string): string {
	let h = 0;
	for (let i = 0; i < seed.length; i++) {
		h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
	}
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	return text
		.split("")
		.map((ch) => {
			if (ch === " ") return " ";
			h = (h * 1103515245 + 12345) | 0;
			return chars[Math.abs(h) % chars.length];
		})
		.join("");
}

async function buildSongHuntConfig(
	admin: ReturnType<typeof createAdminClient>,
	eventId: string,
	config: SongHuntConfig,
	now: Date,
): Promise<Record<string, unknown>> {
	const hints = config.hints.map((hint, i) => {
		const unlocked = now >= new Date(hint.unlocksAt);
		return {
			text: unlocked ? hint.text : garbleText(hint.text, `${eventId}${i}`),
			unlocksAt: hint.unlocksAt,
			unlocked,
		};
	});

	const { data: claims } = await admin
		.from("event_claims")
		.select("claimed_at, user_id")
		.eq("event_id", eventId)
		.order("claimed_at", { ascending: true })
		.limit(3);

	let firstFinders: SongHuntFinder[] = [];
	if (claims && claims.length > 0) {
		const userIds = claims.map((c) => c.user_id as string);
		const { data: herzies } = await admin
			.from("herzies")
			.select("user_id, name")
			.in("user_id", userIds);

		const nameMap = new Map((herzies ?? []).map((h) => [h.user_id, h.name as string]));
		firstFinders = claims.map((c) => ({
			name: nameMap.get(c.user_id as string) ?? "Unknown",
			claimedAt: c.claimed_at as string,
		}));
	}

	return {
		rewardItemId: config.rewardItemId,
		maxClaims: config.maxClaims,
		hints,
		firstFinders,
	};
}

export async function GET() {
	const admin = createAdminClient();
	const now = new Date();

	const { data, error } = await admin
		.from("events")
		.select("id, type, title, description, active, starts_at, ends_at, config")
		.eq("active", true)
		.lte("starts_at", now.toISOString())
		.gte("ends_at", now.toISOString());

	if (error) {
		return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
	}

	const events: GameEvent[] = await Promise.all(
		(data ?? []).map(async (e) => {
			let config: Record<string, unknown>;
			if (e.type === "secret_track") {
				config = { rewardItemId: (e.config as Record<string, unknown>).rewardItemId };
			} else if (e.type === "song_hunt") {
				config = await buildSongHuntConfig(admin, e.id, e.config as SongHuntConfig, now);
			} else {
				config = e.config as Record<string, unknown>;
			}

			return {
				id: e.id,
				type: e.type,
				title: e.title,
				description: e.description,
				active: e.active,
				startsAt: e.starts_at,
				endsAt: e.ends_at,
				config,
			};
		}),
	);

	return NextResponse.json({ events });
}
