import { NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { processSync } from "@/lib/game-server";
import type { SyncRequest, SyncResponse } from "@herzies/shared";

export async function POST(request: Request) {
	const auth = await authenticateRequest(request);
	if (isAuthError(auth)) return auth;

	let body: SyncRequest;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const { nowPlaying, minutesListened, genres } = body;

	if (typeof minutesListened !== "number" || minutesListened < 0) {
		return NextResponse.json(
			{ error: "minutesListened must be a non-negative number" },
			{ status: 400 },
		);
	}

	try {
		const admin = createAdminClient();
		const result = await processSync(
			admin,
			auth.userId,
			nowPlaying,
			minutesListened,
			genres ?? [],
		);

		const response: SyncResponse = {
			herzie: result.herzie,
			notifications: result.notifications,
		};

		return NextResponse.json(response);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Internal server error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
