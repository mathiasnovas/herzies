import type {
	ActiveMultiplier,
	GameEvent,
	Herzie,
	HerzieProfile,
	Inventory,
	Trade,
} from "@herzies/shared";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

export interface ChatMessage {
	id: string;
	userId: string;
	username: string;
	content: string;
	itemRefs: string[];
	createdAt: string;
}

export interface AppState {
	herzie: Herzie | null;
	nowPlaying: { title: string; artist: string } | null;
	multipliers: ActiveMultiplier[] | null;
	isOnline: boolean;
	isConnected: boolean;
	version: string;
}

export const herzies = {
	getState: () => invoke<AppState>("get_state"),

	onStateUpdate: (cb: (state: AppState) => void) => {
		let cancelled = false;
		const unlisten = listen<AppState>("state-update", (event) => {
			if (!cancelled) cb(event.payload);
		});
		return () => {
			cancelled = true;
			unlisten.then((fn) => fn());
		};
	},

	login: () => invoke<boolean>("login"),
	logout: () => invoke<void>("logout"),
	registerHerzie: (name: string) => invoke<void>("register_herzie", { name }),

	friendAdd: (code: string) =>
		invoke<{ success: boolean; message: string }>("friend_add", { code }),
	friendRemove: (code: string) =>
		invoke<{ success: boolean; message: string }>("friend_remove", { code }),
	friendLookup: (codes: string[]) =>
		invoke<Record<string, HerzieProfile>>("friend_lookup", { codes }),

	fetchInventory: () =>
		invoke<{
			inventory: Inventory;
			currency: number;
			equipped: string[];
		} | null>("fetch_inventory"),
	sellItem: (itemId: string, quantity: number) =>
		invoke<{
			earned: number;
			newCurrency: number;
			inventory: Inventory;
		} | null>("sell_item", { itemId, quantity }),
	equipItem: (itemId: string, action: "equip" | "unequip") =>
		invoke<{ equipped: string[] }>("equip_item", { itemId, action }),

	tradeCreate: (targetCode: string) =>
		invoke<{ tradeId: string } | null>("trade_create", { targetCode }),
	tradeJoin: (tradeId: string) => invoke<boolean>("trade_join", { tradeId }),
	tradeOffer: (
		tradeId: string,
		offer: { items: Record<string, number>; currency: number },
	) => invoke<boolean>("trade_offer", { tradeId, offer }),
	tradeLock: (tradeId: string) => invoke<boolean>("trade_lock", { tradeId }),
	tradeAccept: (tradeId: string) =>
		invoke<{ completed: boolean } | null>("trade_accept", { tradeId }),
	tradeCancel: (tradeId: string) =>
		invoke<boolean>("trade_cancel", { tradeId }),
	tradePoll: (tradeId: string) =>
		invoke<Trade | null>("trade_poll", { tradeId }),

	fetchActiveEvents: () =>
		invoke<{ events: GameEvent[] }>("fetch_active_events"),

	getAuthConfig: () =>
		invoke<{
			supabaseUrl: string;
			anonKey: string;
			accessToken: string;
			userId: string;
		} | null>("get_auth_config"),

	chatFetch: () => invoke<{ messages: ChatMessage[] } | null>("chat_fetch"),
	chatSend: (content: string, itemRefs: string[]) =>
		invoke<{ message: ChatMessage } | null>("chat_send", { content, itemRefs }),

	testNotification: () => invoke<void>("test_notification"),
	testActivity: () => invoke<void>("test_activity"),
	quit: () => invoke<void>("quit"),

	/**
	 * Deep-link payloads from notification clicks.
	 *   - `"trade:<tradeId>"` — open TradeView and auto-join the trade
	 *   - any other string — treated as an item ID, opens InventoryView focused on that item
	 */
	onDeepLink: (cb: (payload: string) => void) => {
		let cancelled = false;
		const unlisten = listen<string>("deep-link", (event) => {
			if (!cancelled) cb(event.payload);
		});
		return () => {
			cancelled = true;
			unlisten.then((fn) => fn());
		};
	},

	onActivity: (cb: (message: string) => void) => {
		let cancelled = false;
		const unlisten = listen<string>("activity", (event) => {
			if (!cancelled) cb(event.payload);
		});
		return () => {
			cancelled = true;
			unlisten.then((fn) => fn());
		};
	},
};

/**
 * Tracks whether the Tauri window currently has focus. The tray window is
 * hidden when blurred (200ms after on_blur in tray.rs), so this doubles as
 * "is the window actually visible to the user." Use it to pause animation
 * timers that would otherwise keep burning CPU while the window is invisible.
 */
export function useWindowFocused(): boolean {
	const [focused, setFocused] = useState(true);
	useEffect(() => {
		const w = getCurrentWindow();
		let unlisten: (() => void) | undefined;
		w.onFocusChanged(({ payload }) => setFocused(payload)).then((fn) => {
			unlisten = fn;
		});
		w.isFocused().then((v) => setFocused(v)).catch(() => {});
		return () => {
			unlisten?.();
		};
	}, []);
	return focused;
}
