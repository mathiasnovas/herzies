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
			.select("name, friend_code, stage, level")
			.eq("friend_code", singleCode.toUpperCase().trim())
			.single();

		if (error || !data) {
			return NextResponse.json({ herzie: null });
		}

		return NextResponse.json({
			herzie: {
				name: data.name,
				friendCode: data.friend_code,
				stage: data.stage,
				level: data.level,
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
		.select("name, friend_code, stage, level")
		.in("friend_code", codes);

	if (error || !data) {
		return NextResponse.json({ herzies: [] });
	}

	return NextResponse.json({
		herzies: data.map((row) => ({
			name: row.name,
			friendCode: row.friend_code,
			stage: row.stage,
			level: row.level,
		})),
	});
}
