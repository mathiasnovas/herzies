import type {
	ActiveMultiplier,
	Herzie,
	HerzieProfile,
	Inventory,
	Trade,
} from "@herzies/shared";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

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

	friendAdd: (code: string) =>
		invoke<{ success: boolean; message: string }>("friend_add", { code }),
	friendRemove: (code: string) =>
		invoke<{ success: boolean; message: string }>("friend_remove", { code }),
	friendLookup: (codes: string[]) =>
		invoke<Record<string, HerzieProfile>>("friend_lookup", { codes }),

	fetchInventory: () =>
		invoke<{ inventory: Inventory; currency: number } | null>(
			"fetch_inventory",
		),
	sellItem: (itemId: string, quantity: number) =>
		invoke<{
			earned: number;
			newCurrency: number;
			inventory: Inventory;
		} | null>("sell_item", { itemId, quantity }),

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

	testNotification: () => invoke<void>("test_notification"),
	testActivity: () => invoke<void>("test_activity"),

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
