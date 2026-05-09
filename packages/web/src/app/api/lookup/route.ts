import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

/**
 * Look up herzies by friend code(s). Public endpoint (no auth required).
 *
 * GET /api/lookup?code=HERZ-XXXX          — single lookup
 * GET /api/lookup?codes=HERZ-XXXX,HERZ-YYYY — batch lookup
 */
export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const singleCode = searchParams.get("code");
	const batchCodes = searchParams.get("codes");

	if (!singleCode && !batchCodes) {
		return NextResponse.json(
			{ error: "code or codes query param is required" },
			{ status: 400 },
		);
	}

	const admin = createAdminClient();

	if (singleCode) {
		const { data, error } = await admin
			.from("herzies")
			.select("user_id, name, friend_code, stage, level, currency, appearance")
			.eq("friend_code", singleCode.toUpperCase().trim())
			.single();

		if (error || !data) {
			return NextResponse.json({ herzie: null });
		}

		const topArtists = await getTopArtists(admin, data.user_id);

		return NextResponse.json({
			herzie: {
				name: data.name,
				friendCode: data.friend_code,
				stage: data.stage,
				level: data.level,
				currency: data.currency,
				appearance: data.appearance,
				topArtists,
			},
		});
	}

	const codes = batchCodes!
		.split(",")
		.map((c) => c.trim().toUpperCase())
		.filter(Boolean)
		.slice(0, 50);

	if (codes.length === 0) {
		return NextResponse.json({ herzies: [] });
	}

	const { data, error } = await admin
		.from("herzies")
		.select("user_id, name, friend_code, stage, level, currency, appearance")
		.in("friend_code", codes);

	if (error || !data) {
		return NextResponse.json({ herzies: [] });
	}

	const userIds = data.map((row) => row.user_id);
	const { data: allPlays } = await admin
		.from("listen_log")
		.select("user_id, artist_name")
		.in("user_id", userIds);

	const artistsByUser: Record<string, Record<string, number>> = {};
	for (const row of allPlays ?? []) {
		if (!artistsByUser[row.user_id]) artistsByUser[row.user_id] = {};
		artistsByUser[row.user_id][row.artist_name] =
			(artistsByUser[row.user_id][row.artist_name] ?? 0) + 1;
	}

	return NextResponse.json({
		herzies: data.map((row) => {
			const counts = artistsByUser[row.user_id] ?? {};
			const topArtists = Object.entries(counts)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 3)
				.map(([name, plays]) => ({ name, plays }));

			return {
				name: row.name,
				friendCode: row.friend_code,
				stage: row.stage,
				level: row.level,
				currency: row.currency,
				appearance: row.appearance,
				topArtists,
			};
		}),
	});
}

async function getTopArtists(
	admin: ReturnType<typeof createAdminClient>,
	userId: string,
): Promise<{ name: string; plays: number }[]> {
	const { data: allPlays } = await admin
		.from("listen_log")
		.select("artist_name")
		.eq("user_id", userId);

	const counts: Record<string, number> = {};
	for (const row of allPlays ?? []) {
		counts[row.artist_name] = (counts[row.artist_name] ?? 0) + 1;
	}
	return Object.entries(counts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 3)
		.map(([name, plays]) => ({ name, plays }));
}
