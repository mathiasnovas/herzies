import { createServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Server-side OAuth callback handler.
 * Exchanges the code for a session (setting cookies), then redirects:
 * - With cli_port: to the client-side callback page (which POSTs tokens to CLI)
 * - Without cli_port: to /dashboard
 */
export async function GET(request: NextRequest) {
	const { searchParams } = request.nextUrl;
	const code = searchParams.get("code");
	const cliPort = searchParams.get("cli_port");

	if (!code) {
		return NextResponse.redirect(new URL("/auth/cli?error=missing_code", request.url));
	}

	// If this is a CLI login, let the client-side page handle it
	// (it needs to POST tokens to the local CLI server)
	if (cliPort) {
		const url = new URL("/auth/callback/cli", request.url);
		url.searchParams.set("code", code);
		url.searchParams.set("cli_port", cliPort);
		return NextResponse.redirect(url);
	}

	// Web login: exchange code server-side so cookies get set
	const supabase = await createServerClient();
	const { error } = await supabase.auth.exchangeCodeForSession(code);

	if (error) {
		return NextResponse.redirect(new URL("/auth/cli?error=auth_failed", request.url));
	}

	return NextResponse.redirect(new URL("/dashboard", request.url));
}
