import { NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { rowToHerzie } from "@/lib/game-server";

export async function GET(request: Request) {
	const auth = await authenticateRequest(request);
	if (isAuthError(auth)) return auth;

	const admin = createAdminClient();
	const { data, error } = await admin
		.from("herzies")
		.select("*")
		.eq("user_id", auth.userId)
		.single();

	if (error || !data) {
		return NextResponse.json({ error: "Herzie not found" }, { status: 404 });
	}

	return NextResponse.json({ herzie: rowToHerzie(data) });
}
