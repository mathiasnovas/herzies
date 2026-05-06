import { createServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
	const supabase = await createServerClient();
	await supabase.auth.signOut();
	return NextResponse.redirect(new URL("/", request.url));
}
