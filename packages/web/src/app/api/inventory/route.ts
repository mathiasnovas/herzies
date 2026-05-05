import { NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(request: Request) {
	const auth = await authenticateRequest(request);
	if (isAuthError(auth)) return auth;

	const admin = createAdminClient();
	const { data, error } = await admin
		.from("herzies")
		.select("inventory")
		.eq("user_id", auth.userId)
		.single();

	if (error || !data) {
		return NextResponse.json({ error: "Herzie not found" }, { status: 404 });
	}

	// Also fetch item details
	const inventory: string[] = data.inventory ?? [];
	const { data: items } = await admin
		.from("items")
		.select("*")
		.in("id", inventory.length > 0 ? inventory : ["__none__"]);

	return NextResponse.json({
		inventory,
		items: items ?? [],
	});
}
