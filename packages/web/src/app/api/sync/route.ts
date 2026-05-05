import { NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { processSync } from "@/lib/game-server";
import { syncRequestSchema, parseBody, isParseError } from "@/lib/schemas";
import type { SyncResponse } from "@herzies/shared";

export async function POST(request: Request) {
	const auth = await authenticateRequest(request);
	if (isAuthError(auth)) return auth;

	const body = await parseBody(request, syncRequestSchema);
	if (isParseError(body)) return body;

	const { nowPlaying, minutesListened, genres } = body;

	try {
		const admin = createAdminClient();
		const result = await processSync(
			admin,
			auth.userId,
			nowPlaying,
			minutesListened,
			genres,
		);

		const response: SyncResponse = {
			herzie: result.herzie,
			notifications: result.notifications,
			multipliers: result.multipliers,
			pendingTradeRequest: result.pendingTradeRequest,
		};

		return NextResponse.json(response);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Internal server error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
