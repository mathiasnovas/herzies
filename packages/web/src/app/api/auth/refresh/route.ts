import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Refresh an access token using a refresh token.
 * This allows the CLI to refresh tokens without needing the Supabase anon key.
 */
export async function POST(request: Request) {
	let body: { refreshToken?: string };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const { refreshToken } = body;
	if (!refreshToken || typeof refreshToken !== "string") {
		return NextResponse.json(
			{ error: "refreshToken is required" },
			{ status: 400 },
		);
	}

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{ auth: { autoRefreshToken: false, persistSession: false } },
	);

	const { data, error } = await supabase.auth.refreshSession({
		refresh_token: refreshToken,
	});

	if (error || !data.session) {
		return NextResponse.json(
			{ error: "Failed to refresh token" },
			{ status: 401 },
		);
	}

	return NextResponse.json({
		accessToken: data.session.access_token,
		refreshToken: data.session.refresh_token,
		expiresIn: data.session.expires_in ?? 3600,
	});
}
