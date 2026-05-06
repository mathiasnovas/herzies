import { NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { tradeOfferSchema, parseBody, isParseError } from "@/lib/schemas";

export async function POST(request: Request) {
	const auth = await authenticateRequest(request);
	if (isAuthError(auth)) return auth;

	const body = await parseBody(request, tradeOfferSchema);
	if (isParseError(body)) return body;

	const { tradeId, offer } = body;

	const admin = createAdminClient();

	const { data: trade } = await admin
		.from("trades")
		.select("*")
		.eq("id", tradeId)
		.single();

	if (!trade) {
		return NextResponse.json({ error: "Trade not found" }, { status: 404 });
	}

	const isInitiator = trade.initiator_id === auth.userId;
	const isTarget = trade.target_id === auth.userId;

	if (!isInitiator && !isTarget) {
		return NextResponse.json({ error: "Not your trade" }, { status: 403 });
	}

	// Can only update offer in active or locked states (not pending, completed, cancelled)
	const allowedStates = ["active", "initiator_locked", "target_locked", "both_locked"];
	if (!allowedStates.includes(trade.state as string)) {
		return NextResponse.json({ error: `Cannot update offer in ${trade.state} state` }, { status: 400 });
	}

	// Validate player has what they're offering
	const { data: herzie } = await admin
		.from("herzies")
		.select("inventory_v2, currency")
		.eq("user_id", auth.userId)
		.single();

	if (!herzie) {
		return NextResponse.json({ error: "Herzie not found" }, { status: 404 });
	}

	const inv = (herzie.inventory_v2 ?? {}) as Record<string, number>;

	if ((herzie.currency as number) < offer.currency) {
		return NextResponse.json({ error: "Not enough currency" }, { status: 400 });
	}

	for (const [itemId, qty] of Object.entries(offer.items)) {
		if ((inv[itemId] ?? 0) < qty) {
			return NextResponse.json({ error: `Not enough ${itemId}` }, { status: 400 });
		}
	}

	// Update offer and reset locks (changing offer resets any locks)
	const update: Record<string, unknown> = {
		state: "active",
		initiator_accepted: false,
		target_accepted: false,
		updated_at: new Date().toISOString(),
	};

	if (isInitiator) {
		update.initiator_offer = offer;
	} else {
		update.target_offer = offer;
	}

	const { error } = await admin
		.from("trades")
		.update(update)
		.eq("id", tradeId);

	if (error) {
		return NextResponse.json({ error: "Failed to update offer" }, { status: 500 });
	}

	return NextResponse.json({ ok: true });
}
