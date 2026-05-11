import type { GameEvent, Herzie, HerzieProfile, Inventory, Trade } from "@herzies/shared";
import { levelProgress, xpToNextLevel } from "@herzies/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { Herzie3D } from "./Herzie3D";
import { ItemDisplay } from "./ItemDisplay";
import {
	getItem,
	RARITY_COLORS as ITEM_RARITY_COLORS,
	RARITY_LABELS,
} from "./items";
import { type AppState, type ChatMessage, herzies } from "./tauri-bridge";

type View = "home" | "friends" | "inventory" | "trade" | "events" | "settings";

// --- Shared styles ---

const btnStyle: React.CSSProperties = {
	background: "#333",
	color: "#e0e0e0",
	border: "1px solid #555",
	borderRadius: 4,
	padding: "4px 10px",
	fontSize: 11,
	cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
	background: "#222",
	color: "#e0e0e0",
	border: "1px solid #555",
	borderRadius: 4,
	padding: "4px 10px",
	fontSize: 11,
	outline: "none",
};

// --- Shared components ---

function BackButton({ onClick }: { onClick: () => void }) {
	return (
		<div
			style={{
				fontSize: 13,
				fontWeight: "bold",
				color: "#facc15",
				cursor: "pointer",
			}}
			onClick={onClick}
		>
			← Back
		</div>
	);
}

function NumberTicker({
	value,
	min = 0,
	max,
	onChange,
	size = "normal",
}: {
	value: number;
	min?: number;
	max: number;
	onChange: (v: number) => void;
	size?: "normal" | "small";
}) {
	const small = size === "small";
	const bStyle = { ...btnStyle, ...(small ? { fontSize: 9, padding: "1px 5px" } : {}) };
	const iStyle = {
		...inputStyle,
		width: small ? 36 : 60,
		textAlign: "center" as const,
		...(small ? { fontSize: 9, padding: "1px 2px" } : {}),
	};
	const clamped = Math.max(min, Math.min(value, max));

	return (
		<>
			<button style={bStyle} onClick={() => onChange(Math.max(min, clamped - 1))}>
				−
			</button>
			<input
				type="number"
				min={min}
				max={max}
				value={clamped}
				onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
				style={iStyle}
			/>
			<button style={bStyle} onClick={() => onChange(Math.min(max, clamped + 1))}>
				+
			</button>
		</>
	);
}

// --- Bottom Tab Bar ---

function TabBar({ view, setView }: { view: View; setView: (v: View) => void }) {
	const tabs: { id: View; label: string }[] = [
		{ id: "home", label: "Herzie" },
		{ id: "inventory", label: "Inventory" },
		{ id: "events", label: "Events" },
		{ id: "friends", label: "Friends" },
		{ id: "settings", label: "Settings" },
	];
	return (
		<div
			style={{ display: "flex", borderTop: "1px solid #333", padding: "6px 0" }}
		>
			{tabs.map((t) => (
				<button
					key={t.id}
					onClick={() => setView(t.id)}
					style={{
						...btnStyle,
						border: "none",
						borderRadius: 0,
						flex: 1,
						padding: "4px 0",
						color: view === t.id ? "#7dd3fc" : "#666",
						fontWeight: view === t.id ? "bold" : "normal",
						background: "transparent",
						fontSize: 10,
					}}
				>
					{t.label}
				</button>
			))}
		</div>
	);
}

// --- Home View ---

function HomeView({ state, stageOverride }: { state: AppState; stageOverride?: number | null }) {
	const { herzie, nowPlaying, multipliers, isConnected } = state;
	const [equipped, setEquipped] = useState<string[]>([]);

	useEffect(() => {
		herzies.fetchInventory().then((data) => {
			if (data) setEquipped(data.equipped ?? []);
		});
	}, []);

	if (!herzie) return null;

	const progress = levelProgress(herzie);
	const toNext = xpToNextLevel(herzie);
	const totalHours = (herzie.totalMinutesListened / 60).toFixed(1);
	const activeMultipliers = multipliers ?? [];

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			{/* Header */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 4,
				}}
			>
				<span style={{ fontSize: 13, fontWeight: "bold", color: "#7dd3fc" }}>
					{herzie.name}
				</span>
				<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
					{!isConnected && (
						<span style={{ fontSize: 10, color: "#f87171" }}>
							connect to internet to grow
						</span>
					)}
					<span
						style={{
							fontSize: 10,
							color: isConnected ? "#4ade80" : "#f87171",
							background: isConnected ? "#4ade8020" : "#f8717120",
							padding: "2px 8px",
							borderRadius: 8,
						}}
					>
						{isConnected ? "online" : "offline"}
					</span>
				</div>
			</div>

			{/* Herzie Art — takes up available space */}
			<div
				style={{
					flex: 1,
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					minHeight: 0,
				}}
			>
				<Herzie3D
					userId={herzie.id}
					stage={stageOverride ?? herzie.stage}
					isPlaying={!!nowPlaying}
					wearables={equipped}
				/>
			</div>

			{/* Level & XP */}
			<div style={{ marginBottom: 6 }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						fontSize: 11,
						color: "#aaa",
						marginBottom: 3,
					}}
				>
					<span>Level {herzie.level}</span>
					<span>Stage {herzie.stage}</span>
				</div>
				<div
					style={{
						display: "flex",
						gap: 2,
						height: 8,
					}}
				>
					{Array.from({ length: 40 }, (_, i) => (
						<div
							key={i}
							style={{
								flex: 1,
								background:
									i < Math.round(progress * 40) ? "#4ade80" : "#333",
							}}
						/>
					))}
				</div>
				<div
					style={{
						fontSize: 9,
						color: "#555",
						marginTop: 2,
						textAlign: "right",
					}}
				>
					{Math.ceil(toNext)} XP to next
				</div>
			</div>

			{/* Compact stats row */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					fontSize: 10,
					color: "#888",
					marginBottom: 6,
				}}
			>
				<span>
					<span style={{ color: "#c084fc" }}>{totalHours}h</span> music
				</span>
				<span>
					<span style={{ color: "#facc15" }}>${herzie.currency}</span>
				</span>
				<span>
					<span style={{ color: "#7dd3fc" }}>{herzie.friendCodes.length}</span>{" "}
					friends
				</span>
				{herzie.streakDays > 0 && (
					<span>
						<span style={{ color: "#facc15" }}>{herzie.streakDays}d</span>{" "}
						streak
					</span>
				)}
			</div>

			{/* Bonuses */}
			{!multipliers ? (
				<div style={{ fontSize: 10, color: "#555", marginBottom: 6 }}>
					<span style={{ color: "#facc15" }}>Bonuses:</span> Log in to get
					bonuses
				</div>
			) : activeMultipliers.length > 0 ? (
				<div style={{ marginBottom: 6 }}>
					{activeMultipliers.map((m) => (
						<div
							key={m.name}
							style={{
								fontSize: 10,
								display: "flex",
								justifyContent: "space-between",
							}}
						>
							<span style={{ color: "#facc15" }}>★ {m.name}</span>
							<span style={{ color: "#4ade80" }}>
								+{Math.round(m.bonus * 100)}%
							</span>
						</div>
					))}
				</div>
			) : null}

			{/* Now Playing */}
			{nowPlaying ? (
				<div style={{ borderTop: "1px solid #333", paddingTop: 6 }}>
					<div style={{ fontSize: 9, color: "#555", marginBottom: 1 }}>
						♫ Now Playing
					</div>
					<div
						style={{
							fontSize: 11,
							color: "#e0e0e0",
							fontWeight: "bold",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{nowPlaying.title}
					</div>
					<div
						style={{
							fontSize: 10,
							color: "#888",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{nowPlaying.artist}
					</div>
				</div>
			) : (
				<div style={{ borderTop: "1px solid #333", paddingTop: 6 }}>
					<div style={{ fontSize: 10, color: "#444", textAlign: "center" }}>
						Play some music to start earning XP
					</div>
				</div>
			)}
		</div>
	);
}

// --- Friends View ---

function FriendProfileView({
	profile,
	onBack,
	onTrade,
	onRemove,
	stageOverride,
}: {
	profile: HerzieProfile;
	onBack: () => void;
	onTrade: () => void;
	onRemove: () => void;
	stageOverride?: number | null;
}) {
	const [confirmRemove, setConfirmRemove] = useState(false);

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 8,
					position: "relative",
					zIndex: 10,
				}}
			>
				<BackButton onClick={onBack} />
				<span style={{ fontSize: 13, fontWeight: "bold", color: "#7dd3fc" }}>
					{profile.name}
				</span>
			</div>

			{profile.appearance && (
				<div
					style={{
						flex: 1,
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						minHeight: 0,
					}}
				>
					<Herzie3D
						userId={profile.friendCode}
						stage={stageOverride ?? profile.stage}
					/>
				</div>
			)}

			<div
				style={{
					fontSize: 11,
					color: "#aaa",
					display: "flex",
					justifyContent: "space-between",
					marginBottom: 8,
				}}
			>
				<span>Level {profile.level}</span>
				<span>Stage {profile.stage}</span>
			</div>

			{profile.topArtists && profile.topArtists.length > 0 && (
				<div style={{ marginBottom: 8 }}>
					<div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>
						Top Artists
					</div>
					{profile.topArtists.map((a, i) => (
						<div
							key={a.name}
							style={{
								display: "flex",
								justifyContent: "space-between",
								fontSize: 11,
								padding: "2px 0",
								borderBottom: "1px solid #222",
							}}
						>
							<span style={{ color: "#e0e0e0" }}>
								{i + 1}. {a.name}
							</span>
							<span style={{ color: "#666" }}>{a.plays} plays</span>
						</div>
					))}
				</div>
			)}

			<div style={{ display: "flex", gap: 6 }}>
				<button
					style={{ ...btnStyle, color: "#c084fc" }}
					onClick={onTrade}
				>
					Trade
				</button>
				{confirmRemove ? (
					<>
						<button
							style={{ ...btnStyle, color: "#f87171" }}
							onClick={onRemove}
						>
							Yes, remove
						</button>
						<button
							style={btnStyle}
							onClick={() => setConfirmRemove(false)}
						>
							Cancel
						</button>
					</>
				) : (
					<button
						style={{ ...btnStyle, color: "#f87171" }}
						onClick={() => setConfirmRemove(true)}
					>
						Remove friend
					</button>
				)}
			</div>
		</div>
	);
}

function FriendsView({
	herzie,
	onStartTrade,
	stageOverride,
}: {
	herzie: Herzie;
	onStartTrade: (code: string) => void;
	stageOverride?: number | null;
}) {
	const [friends, setFriends] = useState<Record<string, HerzieProfile> | null>(
		null,
	);
	const [addCode, setAddCode] = useState("");
	const [message, setMessage] = useState("");
	const [selectedFriend, setSelectedFriend] = useState<HerzieProfile | null>(null);

	const loadFriends = useCallback(async () => {
		if (herzie.friendCodes.length === 0) {
			setFriends({});
			return;
		}
		const data = await herzies.friendLookup(herzie.friendCodes);
		setFriends(data);
	}, [herzie.friendCodes]);

	useEffect(() => {
		loadFriends();
	}, [loadFriends]);

	const handleAdd = async () => {
		const code = addCode.trim().toUpperCase();
		if (!code) return;
		const result = await herzies.friendAdd(code);
		setMessage(result.message);
		if (result.success) {
			setAddCode("");
			loadFriends();
		}
		setTimeout(() => setMessage(""), 3000);
	};

	const handleRemove = async (code: string) => {
		const result = await herzies.friendRemove(code);
		setMessage(result.message);
		if (result.success) loadFriends();
		setTimeout(() => setMessage(""), 3000);
	};

	if (selectedFriend) {
		return (
			<FriendProfileView
				profile={selectedFriend}
				onBack={() => setSelectedFriend(null)}
				onTrade={() => {
					setSelectedFriend(null);
					onStartTrade(selectedFriend.friendCode);
				}}
				onRemove={async () => {
					await handleRemove(selectedFriend.friendCode);
					setSelectedFriend(null);
				}}
				stageOverride={stageOverride}
			/>
		);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<div
				style={{
					fontSize: 13,
					fontWeight: "bold",
					color: "#7dd3fc",
					marginBottom: 8,
				}}
			>
				Friends ({herzie.friendCodes.length}/20)
			</div>

			{/* Add friend */}
			<div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
				<input
					style={{ ...inputStyle, flex: 1 }}
					placeholder="HERZ-XXXX"
					value={addCode}
					onChange={(e) => setAddCode(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleAdd()}
				/>
				<button style={btnStyle} onClick={handleAdd}>
					Add
				</button>
			</div>

			{message && (
				<div
					style={{
						fontSize: 11,
						color: message.includes("!") ? "#4ade80" : "#f87171",
						marginBottom: 6,
					}}
				>
					{message}
				</div>
			)}

			{/* Friend code */}
			<div style={{ fontSize: 10, color: "#666", marginBottom: 8 }}>
				Your code:{" "}
				<span style={{ color: "#7dd3fc", fontWeight: "bold" }}>
					{herzie.friendCode}
				</span>
			</div>

			{/* Friend list */}
			<div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
				{herzie.friendCodes.length === 0 ? (
					<div
						style={{
							fontSize: 12,
							color: "#555",
							textAlign: "center",
							paddingTop: 20,
						}}
					>
						No friends yet. Share your code above!
					</div>
				) : !friends ? (
					<div
						style={{
							fontSize: 12,
							color: "#555",
							textAlign: "center",
							paddingTop: 20,
						}}
					>
						Loading...
					</div>
				) : (
					herzie.friendCodes.map((code) => {
						const profile = friends[code];
						return (
							<div
								key={code}
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									padding: "4px 0",
									borderBottom: "1px solid #222",
								}}
							>
								<div
									style={{ cursor: profile ? "pointer" : "default" }}
									onClick={() => profile && setSelectedFriend(profile)}
								>
									<div style={{ fontSize: 12, color: "#e0e0e0" }}>
										{profile?.name ?? code}
									</div>
									<div style={{ fontSize: 10, color: "#666" }}>
										{profile
											? `Lv.${profile.level} · Stage ${profile.stage}`
											: code}
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}

// --- Inventory View ---

function SellControls({
	itemId,
	qty,
	price,
	onSell,
}: {
	itemId: string;
	qty: number;
	price: number;
	onSell: (itemId: string, qty: number) => void;
}) {
	const [sellAmount, setSellAmount] = useState(1);
	const clamped = Math.max(1, Math.min(sellAmount, qty));

	return (
		<div>
			<div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>
				Sell for ${price} each
			</div>
			<div style={{ display: "flex", gap: 4, alignItems: "center" }}>
				<NumberTicker value={clamped} min={1} max={qty} onChange={setSellAmount} />
				<button style={btnStyle} onClick={() => onSell(itemId, clamped)}>
					Sell (${clamped * price})
				</button>
				{qty > 1 && (
					<button style={btnStyle} onClick={() => onSell(itemId, qty)}>
						Sell All ({qty})
					</button>
				)}
			</div>
		</div>
	);
}

function InventoryView({ herzie, initialItem, onLog }: { herzie: Herzie; initialItem?: string | null; onLog?: (msg: string) => void }) {
	const [inventory, setInventory] = useState<Inventory | null>(null);
	const [currency, setCurrency] = useState(herzie.currency);
	const [equipped, setEquipped] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedItem, setSelectedItem] = useState<string | null>(initialItem ?? null);

	const load = useCallback(async () => {
		const data = await herzies.fetchInventory();
		if (data) {
			setInventory(data.inventory);
			setCurrency(data.currency);
			setEquipped(data.equipped ?? []);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const handleSell = async (itemId: string, qty: number) => {
		const result = await herzies.sellItem(itemId, qty);
		if (result) {
			setInventory(result.inventory);
			setCurrency(result.newCurrency);
		}
	};

	const handleEquip = async (itemId: string) => {
		const isEquipped = equipped.includes(itemId);
		const action = isEquipped ? "unequip" : "equip";
		const item = getItem(itemId);
		const name = item?.name ?? itemId;
		try {
			const result = await herzies.equipItem(itemId, action);
			setEquipped(result.equipped);
			onLog?.(action === "equip" ? `Equipped ${name}` : `Unequipped ${name}`);
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			onLog?.(`Failed to ${action} ${name}: ${msg}`);
		}
	};

	const rarityOrder: Record<string, number> = { legendary: 0, rare: 1, uncommon: 2, common: 3 };
	const items = inventory
		? Object.entries(inventory)
				.filter(([, qty]) => qty > 0)
				.sort((a, b) => {
					const ra = rarityOrder[getItem(a[0])?.rarity ?? "common"] ?? 3;
					const rb = rarityOrder[getItem(b[0])?.rarity ?? "common"] ?? 3;
					if (ra !== rb) return ra - rb;
					return (getItem(a[0])?.name ?? a[0]).localeCompare(getItem(b[0])?.name ?? b[0]);
				})
		: [];
	const selected = selectedItem ? getItem(selectedItem) : null;

	// Detail view for selected item
	if (selected && selectedItem) {
		const qty = inventory?.[selectedItem] ?? 0;
		return (
			<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 8,
					}}
				>
					<BackButton onClick={() => setSelectedItem(null)} />
					<div style={{ fontSize: 12, color: "#facc15" }}>${currency}</div>
				</div>

				{/* Spinning 3D art */}
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						padding: "8px 0",
						marginBottom: 8,
					}}
				>
					<ItemDisplay item={selected} size={9} />
				</div>

				{/* Item info */}
				<div
					style={{
						fontSize: 14,
						fontWeight: "bold",
						color: ITEM_RARITY_COLORS[selected.rarity],
					}}
				>
					{selected.name}
				</div>
				<div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
					{RARITY_LABELS[selected.rarity]} · x{qty}
				</div>
				<div style={{ fontSize: 12, color: "#aaa", marginBottom: 12 }}>
					{selected.description}
				</div>

				{/* Equip/Unequip */}
				{selected.equipable && (
					<button
						style={{
							...btnStyle,
							color: equipped.includes(selectedItem) ? "#f87171" : "#4ade80",
							marginBottom: 8,
							alignSelf: "flex-start",
						}}
						onClick={() => handleEquip(selectedItem)}
					>
						{equipped.includes(selectedItem) ? "Unequip" : "Equip"}
					</button>
				)}

				{/* Sell controls */}
				{selected.sellPrice && qty > 0 && (
					<SellControls
						itemId={selectedItem}
						qty={qty}
						price={selected.sellPrice}
						onSell={handleSell}
					/>
				)}
			</div>
		);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 8,
				}}
			>
				<div style={{ fontSize: 13, fontWeight: "bold", color: "#facc15" }}>
					Inventory
				</div>
				<div style={{ fontSize: 12, color: "#facc15" }}>${currency}</div>
			</div>

			{loading ? (
				<div
					style={{
						fontSize: 12,
						color: "#555",
						textAlign: "center",
						paddingTop: 20,
					}}
				>
					Loading...
				</div>
			) : items.length === 0 ? (
				<div
					style={{
						fontSize: 12,
						color: "#555",
						textAlign: "center",
						paddingTop: 20,
					}}
				>
					No items yet. Keep listening to earn drops!
				</div>
			) : (
				<div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
					{items.map(([itemId, qty]) => {
						const def = getItem(itemId);
						const name = def?.name ?? itemId;
						const rarity = def?.rarity ?? "common";
						return (
							<div
								key={itemId}
								onClick={() => setSelectedItem(itemId)}
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									padding: "6px 0",
									borderBottom: "1px solid #222",
									cursor: "pointer",
								}}
							>
								<div>
									<div
										style={{ fontSize: 12, color: ITEM_RARITY_COLORS[rarity] }}
									>
										{name}
									</div>
									<div style={{ fontSize: 10, color: "#666" }}>
										x{qty}
										{def?.sellPrice ? ` · $${def.sellPrice} each` : ""}
										{equipped.includes(itemId) && (
											<span style={{ color: "#4ade80", marginLeft: 4 }}>[equipped]</span>
										)}
									</div>
								</div>
								<span style={{ color: "#555", fontSize: 12 }}>→</span>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

// --- Trade View ---

function TradeView({
	herzie,
	initialTarget,
	onClose,
}: {
	herzie: Herzie;
	initialTarget?: string | null;
	onClose: () => void;
}) {
	const [targetCode, setTargetCode] = useState(initialTarget ?? "");
	const [tradeId, setTradeId] = useState<string | null>(null);
	const [trade, setTrade] = useState<Trade | null>(null);
	const [message, setMessage] = useState("");
	const creatingRef = useRef(false);
	const [inventory, setInventory] = useState<Inventory | null>(null);
	const [offerItems, setOfferItems] = useState<Record<string, number>>({});
	const [offerCurrency, setOfferCurrency] = useState(0);
	const [currency, setCurrency] = useState(herzie.currency);

	useEffect(() => {
		herzies.fetchInventory().then((data) => {
			if (data) {
				setInventory(data.inventory);
				setCurrency(data.currency);
			}
		});
	}, []);

	// Poll active trade
	useEffect(() => {
		if (!tradeId) return;
		const interval = setInterval(async () => {
			const t = await herzies.tradePoll(tradeId);
			if (t) setTrade(t);
			if (t?.state === "completed" || t?.state === "cancelled") {
				setMessage(
					t.state === "completed" ? "Trade completed!" : "Trade cancelled",
				);
				setTimeout(() => {
					onClose();
				}, 2000);
			}
		}, 1500);
		return () => clearInterval(interval);
	}, [tradeId, onClose]);

	const handleCreate = useCallback(async (overrideCode?: string) => {
		const code = (overrideCode ?? targetCode).trim().toUpperCase();
		if (!code) return;
		if (creatingRef.current) return;
		creatingRef.current = true;
		const result = await herzies.tradeCreate(code);
		creatingRef.current = false;
		if (result) {
			setTradeId(result.tradeId);
			setTargetCode("");
		} else setMessage("Failed to create trade");
	}, [targetCode]);

	// Auto-start trade when opened from friends list
	useEffect(() => {
		if (initialTarget && !tradeId) {
			handleCreate(initialTarget);
		}
	}, [initialTarget]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleCancel = async () => {
		if (tradeId) await herzies.tradeCancel(tradeId);
		onClose();
	};

	const handleSendOffer = async () => {
		if (!tradeId) return;
		const items: Record<string, number> = {};
		for (const [id, qty] of Object.entries(offerItems)) {
			if (qty > 0) items[id] = qty;
		}
		await herzies.tradeOffer(tradeId, { items, currency: offerCurrency });
	};

	const handleLock = async () => {
		if (tradeId) {
			await handleSendOffer();
			await herzies.tradeLock(tradeId);
		}
	};
	const handleAccept = async () => {
		if (tradeId) await herzies.tradeAccept(tradeId);
	};

	// No active trade — show create form or loading if auto-starting
	if (!tradeId) {
		if (initialTarget) {
			return (
				<div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", alignItems: "center" }}>
					<div style={{ fontSize: 12, color: "#888" }}>
						{message || "Starting trade..."}
					</div>
				</div>
			);
		}
		return (
			<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
				<div
					style={{
						fontSize: 13,
						fontWeight: "bold",
						color: "#c084fc",
						marginBottom: 8,
					}}
				>
					Trade
				</div>

				<div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
					<input
						style={{ ...inputStyle, flex: 1 }}
						placeholder="Friend code to trade with"
						value={targetCode}
						onChange={(e) => setTargetCode(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleCreate()}
					/>
					<button style={btnStyle} onClick={() => handleCreate()}>
						Start
					</button>
				</div>

				{message && (
					<div style={{ fontSize: 11, color: "#f87171" }}>{message}</div>
				)}

				<div
					style={{
						fontSize: 12,
						color: "#555",
						textAlign: "center",
						paddingTop: 20,
					}}
				>
					Enter a friend's code to start a trade
				</div>
			</div>
		);
	}

	// Active trade
	const myOffer = trade
		? trade.initiatorName === herzie.name
			? trade.initiatorOffer
			: trade.targetOffer
		: null;
	const theirOffer = trade
		? trade.initiatorName === herzie.name
			? trade.targetOffer
			: trade.initiatorOffer
		: null;
	const myLocked = trade
		? trade.initiatorName === herzie.name
			? trade.state === "initiator_locked" || trade.state === "both_locked"
			: trade.state === "target_locked" || trade.state === "both_locked"
		: false;
	const bothLocked = trade?.state === "both_locked";

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 8,
				}}
			>
				<div style={{ fontSize: 13, fontWeight: "bold", color: "#c084fc" }}>
					Trading with{" "}
					{trade
						? trade.initiatorName === herzie.name
							? trade.targetName
							: trade.initiatorName
						: "..."}
				</div>
				<button
					style={{ ...btnStyle, fontSize: 10, color: "#f87171" }}
					onClick={handleCancel}
				>
					Cancel
				</button>
			</div>

			{!trade || trade.state === "pending" ? (
				<div
					style={{
						fontSize: 12,
						color: "#555",
						textAlign: "center",
						paddingTop: 20,
					}}
				>
					Waiting for them to join...
				</div>
			) : (
				<>
					{/* Offers side by side */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: 8,
							flex: 1,
						}}
					>
						<div>
							<div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
								Your offer {myLocked ? "🔒" : ""}
							</div>
							{myLocked ? (
								<>
									{myOffer &&
										Object.entries(myOffer.items).map(([id, qty]) => (
											<div key={id} style={{ fontSize: 11, color: "#ccc" }}>
												{getItem(id)?.name ?? id} x{qty}
											</div>
										))}
									{myOffer && myOffer.currency > 0 && (
										<div style={{ fontSize: 11, color: "#facc15" }}>
											${myOffer.currency}
										</div>
									)}
								</>
							) : (
								<>
									{inventory &&
										Object.entries(inventory)
											.filter(([, qty]) => qty > 0)
											.map(([id, qty]) => {
												const item = getItem(id);
												if (!item) return null;
												const offered = offerItems[id] ?? 0;
												return (
													<div
														key={id}
														style={{
															display: "flex",
															alignItems: "center",
															gap: 4,
															marginBottom: 2,
														}}
													>
														<span style={{ fontSize: 10, color: "#ccc", flex: 1 }}>
															{item.name} ({qty})
														</span>
														<NumberTicker
															value={offered}
															max={qty}
															size="small"
															onChange={(v) =>
																setOfferItems((prev) => ({ ...prev, [id]: v }))
															}
														/>
													</div>
												);
											})}
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 4,
											marginTop: 4,
										}}
									>
										<span style={{ fontSize: 10, color: "#facc15", flex: 1 }}>
											$ ({currency})
										</span>
										<NumberTicker
											value={offerCurrency}
											max={currency}
											size="small"
											onChange={setOfferCurrency}
										/>
									</div>
								</>
							)}
						</div>
						<div>
							<div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
								Their offer
							</div>
							{theirOffer &&
								Object.entries(theirOffer.items).map(([id, qty]) => (
									<div key={id} style={{ fontSize: 11, color: "#ccc" }}>
										{id} x{qty}
									</div>
								))}
							{theirOffer && theirOffer.currency > 0 && (
								<div style={{ fontSize: 11, color: "#facc15" }}>
									${theirOffer.currency}
								</div>
							)}
							{theirOffer &&
								Object.keys(theirOffer.items).length === 0 &&
								theirOffer.currency === 0 && (
									<div style={{ fontSize: 10, color: "#ccc" }}>Empty</div>
								)}
						</div>
					</div>

					{/* Actions */}
					<div style={{ display: "flex", gap: 4, marginTop: 8 }}>
						{!myLocked && (
							<button style={btnStyle} onClick={handleLock}>
								Lock offer
							</button>
						)}
						{bothLocked && (
							<button
								style={{ ...btnStyle, color: "#4ade80" }}
								onClick={handleAccept}
							>
								Accept
							</button>
						)}
					</div>
				</>
			)}

			{message && (
				<div style={{ fontSize: 11, color: "#4ade80", marginTop: 8 }}>
					{message}
				</div>
			)}
		</div>
	);
}

// --- Events View ---

function formatCountdown(endsAt: string): string {
	const ms = new Date(endsAt).getTime() - Date.now();
	if (ms <= 0) return "ended";
	const hours = Math.floor(ms / 3_600_000);
	const days = Math.floor(hours / 24);
	const h = hours % 24;
	if (days > 0) return `${days}d ${h}h left`;
	if (hours > 0) return `${hours}h left`;
	return "< 1h left";
}

function timeAgo(dateStr: string): string {
	const ms = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(ms / 60_000);
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function EventsView() {
	const [events, setEvents] = useState<GameEvent[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		herzies
			.fetchActiveEvents()
			.then((data) => {
				setEvents(data.events);
				setLoading(false);
			})
			.catch(() => setLoading(false));

		const interval = setInterval(() => {
			herzies.fetchActiveEvents().then((data) => setEvents(data.events));
		}, 60_000);
		return () => clearInterval(interval);
	}, []);

	if (loading) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100%",
					fontSize: 12,
					color: "#555",
				}}
			>
				Loading...
			</div>
		);
	}

	const hunt = events.find((e) => e.type === "song_hunt");

	if (!hunt) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100%",
					fontSize: 12,
					color: "#555",
					textAlign: "center",
				}}
			>
				No active Song Hunt. Check back Monday!
			</div>
		);
	}

	const config = hunt.config as {
		rewardItemId: string;
		maxClaims: number;
		hints: Array<{
			text: string;
			unlocksAt: string;
			unlocked: boolean;
		}>;
		firstFinders: Array<{
			name: string;
			claimedAt: string;
		}>;
	};

	const rewardItem = getItem(config.rewardItemId);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				height: "100%",
				overflow: "auto",
			}}
		>
			{/* Title + countdown */}
			<div style={{ marginBottom: 8 }}>
				<div
					style={{
						fontSize: 13,
						fontWeight: "bold",
						color: "#7dd3fc",
					}}
				>
					{hunt.title}
				</div>
				<div style={{ fontSize: 10, color: "#666" }}>
					{formatCountdown(hunt.endsAt)}
				</div>
			</div>

			{/* Reward preview */}
			{rewardItem && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 8,
						marginBottom: 10,
						padding: "6px 0",
						borderBottom: "1px solid #222",
					}}
				>
					<ItemDisplay item={rewardItem} size={7} />
					<div
						style={{
							fontSize: 11,
							color: ITEM_RARITY_COLORS[rewardItem.rarity],
						}}
					>
						{rewardItem.name}
					</div>
				</div>
			)}

			{/* Hints */}
			<div style={{ marginBottom: 10 }}>
				<div
					style={{
						fontSize: 10,
						color: "#666",
						marginBottom: 4,
					}}
				>
					Hints
				</div>
				{config.hints.map((hint, i) => (
					<div
						key={i}
						style={{
							marginBottom: 4,
							padding: "4px 0",
							borderBottom: "1px solid #222",
						}}
					>
						{hint.unlocked ? (
							<div style={{ fontSize: 11, color: "#e0e0e0" }}>
								{hint.text}
							</div>
						) : (
							<>
								<div
									style={{
										fontSize: 11,
										color: "#555",
										fontFamily: "monospace",
									}}
								>
									{hint.text}
								</div>
								<div style={{ fontSize: 9, color: "#444" }}>
									unlocks {formatCountdown(hint.unlocksAt).replace(" left", "")}
								</div>
							</>
						)}
					</div>
				))}
			</div>

			{/* First Finders */}
			<div>
				<div
					style={{
						fontSize: 10,
						color: "#666",
						marginBottom: 4,
					}}
				>
					First Finders
				</div>
				{config.firstFinders && config.firstFinders.length > 0 ? (
					config.firstFinders.slice(0, 3).map((finder, i) => (
						<div
							key={i}
							style={{
								display: "flex",
								justifyContent: "space-between",
								fontSize: 11,
								padding: "2px 0",
								borderBottom: "1px solid #222",
							}}
						>
							<span style={{ color: "#facc15" }}>{finder.name}</span>
							<span style={{ color: "#555" }}>
								{timeAgo(finder.claimedAt)}
							</span>
						</div>
					))
				) : (
					<div style={{ fontSize: 11, color: "#555" }}>
						No one has found it yet...
					</div>
				)}
			</div>
		</div>
	);
}

// --- Settings View ---

function SettingsView({ state, stageOverride, onStageOverride }: { state: AppState; stageOverride: number | null; onStageOverride: (v: number | null) => void }) {
	const [loggingIn, setLoggingIn] = useState(false);

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<div
				style={{
					fontSize: 13,
					fontWeight: "bold",
					color: "#e0e0e0",
					marginBottom: 12,
				}}
			>
				Settings
			</div>

			{/* Account */}
			<div style={{ marginBottom: 16 }}>
				<div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
					Account
				</div>
				{state.isOnline ? (
					<button
						style={{ ...btnStyle, color: "#f87171" }}
						onClick={() => herzies.logout()}
					>
						Logout
					</button>
				) : (
					<button
						style={{ ...btnStyle, color: "#4ade80" }}
						disabled={loggingIn}
						onClick={async () => {
							setLoggingIn(true);
							await herzies.login();
							setLoggingIn(false);
						}}
					>
						{loggingIn ? "Logging in..." : "Login"}
					</button>
				)}
			</div>

			{/* Debug */}
			<div style={{ marginBottom: 16 }}>
				<div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
					Debug
				</div>
				<div style={{ display: "flex", gap: 4 }}>
					<button style={btnStyle} onClick={() => herzies.testNotification()}>
						Test Notification
					</button>
					<button style={btnStyle} onClick={() => herzies.testActivity()}>
						Test Activity Log
					</button>
				</div>
			</div>

			{/* Dev-only stage selector */}
			{import.meta.env.DEV && (
				<div style={{ marginBottom: 16 }}>
					<div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
						Stage Preview
					</div>
					<div style={{ display: "flex", gap: 4 }}>
						{[null, 1, 2, 3].map((s) => (
							<button
								key={s ?? "default"}
								style={{
									...btnStyle,
									color: stageOverride === s ? "#7dd3fc" : "#888",
									borderColor: stageOverride === s ? "#7dd3fc" : "#555",
								}}
								onClick={() => onStageOverride(s)}
							>
								{s === null ? "Default" : `Stage ${s}`}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Quit */}
			<div style={{ marginTop: "auto", marginBottom: 8 }}>
				<button
					style={{ ...btnStyle, color: "#f87171" }}
					onClick={() => herzies.quit()}
				>
					Quit Herzies
				</button>
			</div>

			{/* Version */}
			<div style={{ fontSize: 11, color: "#555" }}>
				Herzies Desktop v{state.version}
			</div>
		</div>
	);
}

// --- Splash Screen ---

const BANNER = `\
 _                   _
| |                 (_)
| |__   ___ _ __ _____  ___  ___
| '_ \\ / _ \\ '__|_  / |/ _ \\/ __|
| | | |  __/ |   / /| |  __/\\__ \\
|_| |_|\\___|_|  /___|_|\\___||___/`;

function SplashScreen() {
	const [loggingIn, setLoggingIn] = useState(false);

	return (
		<div
			data-tauri-drag-region
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				height: "100vh",
				gap: 20,
			}}
		>
			<div style={{ display: "flex", justifyContent: "center" }}>
				<pre
					style={{
						color: "#c084fc",
						fontSize: 14,
						lineHeight: 1.15,
						margin: 0,
					}}
				>
					{BANNER}
				</pre>
			</div>
			<button
				style={{
					...btnStyle,
					padding: "8px 24px",
					fontSize: 13,
					color: "#4ade80",
				}}
				disabled={loggingIn}
				onClick={async () => {
					setLoggingIn(true);
					await herzies.login();
					setLoggingIn(false);
				}}
			>
				{loggingIn ? "Opening browser..." : "Login"}
			</button>
		</div>
	);
}

// --- Chat ---

const CHAT_COLORS = ['#7dd3fc', '#fca5a5', '#86efac', '#fde047', '#c4b5fd', '#fdba74', '#f9a8d4', '#67e8f9'];
function usernameColor(name: string): string {
	let hash = 0;
	for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
	return CHAT_COLORS[Math.abs(hash) % CHAT_COLORS.length];
}

function ItemInspectOverlay({ itemId, onClose }: { itemId: string; onClose: () => void }) {
	const item = getItem(itemId);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	if (!item) return null;

	return (
		<div
			onClick={onClose}
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(0,0,0,0.7)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1000,
			}}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				style={{
					background: "#1a1a1a",
					border: "1px solid #333",
					borderRadius: 8,
					padding: 16,
					maxWidth: 260,
					textAlign: "center",
				}}
			>
				<div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
					<ItemDisplay item={item} size={9} />
				</div>
				<div style={{ fontSize: 14, fontWeight: "bold", color: ITEM_RARITY_COLORS[item.rarity] }}>
					{item.name}
				</div>
				<div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
					{RARITY_LABELS[item.rarity]}
				</div>
				<div style={{ fontSize: 11, color: "#aaa" }}>
					{item.description}
				</div>
			</div>
		</div>
	);
}

function ChatPanel({ activityLog, isOnline }: {
	activityLog: { time: string; message: string }[];
	isOnline: boolean;
}) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState('');
	const [itemRefs, setItemRefs] = useState<string[]>([]);
	const [cooldown, setCooldown] = useState(false);
	const [inspectItem, setInspectItem] = useState<string | null>(null);
	const [inventory, setInventory] = useState<Inventory | null>(null);
	const [showAutocomplete, setShowAutocomplete] = useState(false);
	const [autocompleteFilter, setAutocompleteFilter] = useState('');
	const [autocompleteIndex, setAutocompleteIndex] = useState(0);
	const scrollRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const channelRef = useRef<RealtimeChannel | null>(null);
	const atPosRef = useRef<number>(-1);

	// Fetch initial messages
	useEffect(() => {
		if (!isOnline) return;
		herzies.chatFetch().then(data => {
			if (data) setMessages(data.messages);
		});
	}, [isOnline]);

	// Supabase Realtime subscription
	useEffect(() => {
		if (!isOnline) return;
		let cancelled = false;

		herzies.getAuthConfig().then(config => {
			if (cancelled || !config) return;
			const supabase = createClient(config.supabaseUrl, config.anonKey, {
				global: { headers: { Authorization: `Bearer ${config.accessToken}` } },
			});

			const channel = supabase
				.channel('chat_messages_realtime')
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'chat_messages' } as any, (payload: any) => {
					const newId = payload.new?.id;
					if (!newId) return;
					setMessages(prev => {
						if (prev.some(m => m.id === newId)) return prev;
						herzies.chatFetch().then(data => {
							if (data) setMessages(data.messages);
						});
						return prev;
					});
				})
				.subscribe();

			channelRef.current = channel;
		});

		return () => {
			cancelled = true;
			if (channelRef.current) {
				channelRef.current.unsubscribe();
				channelRef.current = null;
			}
		};
	}, [isOnline]);

	// Fetch inventory for autocomplete
	useEffect(() => {
		if (!isOnline) return;
		herzies.fetchInventory().then(data => {
			if (data) setInventory(data.inventory);
		});
	}, [isOnline]);

	// Auto-scroll
	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages, activityLog]);

	// Send handler
	const handleSend = async () => {
		if (!input.trim() || cooldown) return;
		const content = input.trim();
		const refs = [...itemRefs];
		setInput('');
		setItemRefs([]);
		setShowAutocomplete(false);
		setCooldown(true);
		setTimeout(() => setCooldown(false), 1500);

		const result = await herzies.chatSend(content, refs);
		if (result) {
			setMessages(prev => {
				if (prev.some(m => m.id === result.message.id)) return prev;
				return [...prev, result.message];
			});
		}
	};

	// Build filtered autocomplete items
	const autocompleteItems = inventory
		? Object.entries(inventory)
				.filter(([, qty]) => qty > 0)
				.map(([id]) => ({ id, item: getItem(id) }))
				.filter((x): x is { id: string; item: NonNullable<ReturnType<typeof getItem>> } => !!x.item)
				.filter(x => !autocompleteFilter || x.item.name.toLowerCase().includes(autocompleteFilter.toLowerCase()))
		: [];

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setInput(val);

		const cursorPos = e.target.selectionStart ?? val.length;
		// Find the last @ before cursor that isn't preceded by a non-space
		const before = val.slice(0, cursorPos);
		const atIdx = before.lastIndexOf('@');
		if (atIdx >= 0 && (atIdx === 0 || before[atIdx - 1] === ' ')) {
			const filterText = before.slice(atIdx + 1);
			// Don't show autocomplete if there's a space after the filter (completed reference)
			if (!filterText.includes(' ')) {
				setShowAutocomplete(true);
				setAutocompleteFilter(filterText);
				setAutocompleteIndex(0);
				atPosRef.current = atIdx;
				return;
			}
		}
		setShowAutocomplete(false);
	};

	const selectAutocomplete = (itemId: string, itemName: string) => {
		const atIdx = atPosRef.current;
		if (atIdx < 0) return;
		const before = input.slice(0, atIdx);
		const cursorPos = inputRef.current?.selectionStart ?? input.length;
		const after = input.slice(cursorPos);
		const newInput = `${before}@${itemId} ${after}`;
		setInput(newInput);
		if (!itemRefs.includes(itemId)) {
			setItemRefs(prev => [...prev, itemId]);
		}
		setShowAutocomplete(false);
		inputRef.current?.focus();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (showAutocomplete && autocompleteItems.length > 0) {
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setAutocompleteIndex(i => Math.max(0, i - 1));
				return;
			}
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setAutocompleteIndex(i => Math.min(autocompleteItems.length - 1, i + 1));
				return;
			}
			if (e.key === "Tab" || e.key === "Enter") {
				e.preventDefault();
				const sel = autocompleteItems[autocompleteIndex];
				if (sel) selectAutocomplete(sel.id, sel.item.name);
				return;
			}
			if (e.key === "Escape") {
				e.preventDefault();
				setShowAutocomplete(false);
				return;
			}
		}
		if (e.key === "Enter" && !showAutocomplete) {
			e.preventDefault();
			handleSend();
		}
	};

	// Render item ref inline: replace @item-id with colored item name
	const renderMessageContent = (content: string, msgItemRefs: string[]) => {
		if (msgItemRefs.length === 0) return <span>{content}</span>;

		const parts: React.ReactNode[] = [];
		let remaining = content;
		let key = 0;

		for (const ref of msgItemRefs) {
			const pattern = `@${ref}`;
			const idx = remaining.indexOf(pattern);
			if (idx >= 0) {
				if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
				const item = getItem(ref);
				parts.push(
					<span
						key={key++}
						style={{
							color: item ? ITEM_RARITY_COLORS[item.rarity] : '#c084fc',
							cursor: 'pointer',
							textDecoration: 'underline',
							textDecorationStyle: 'dotted',
						}}
						onClick={() => setInspectItem(ref)}
					>
						{item?.name ?? ref}
					</span>
				);
				remaining = remaining.slice(idx + pattern.length);
			}
		}
		if (remaining) parts.push(<span key={key++}>{remaining}</span>);
		return <>{parts}</>;
	};

	// Merge activity log entries and chat messages chronologically
	type FeedEntry =
		| { kind: 'activity'; time: string; message: string; sortKey: string }
		| { kind: 'chat'; msg: ChatMessage; sortKey: string };

	const feed: FeedEntry[] = [];

	// Activity log entries don't have a full timestamp, just HH:MM. Use today's date for sorting.
	const today = new Date().toISOString().slice(0, 10);
	for (const entry of activityLog) {
		feed.push({ kind: 'activity', time: entry.time, message: entry.message, sortKey: `${today}T${entry.time}:00` });
	}
	for (const msg of messages) {
		feed.push({ kind: 'chat', msg, sortKey: msg.createdAt });
	}
	feed.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

	return (
		<>
			<div style={{ borderTop: "1px solid #333", display: "flex", flexDirection: "column" }}>
				{/* Message feed */}
				<div
					ref={scrollRef}
					style={{
						maxHeight: 84,
						minHeight: 28,
						overflow: "auto",
						padding: "4px 0",
					}}
				>
					{feed.length === 0 && (
						<div style={{ fontSize: 9, color: "#444", textAlign: "center", padding: "4px 0" }}>
							No messages yet
						</div>
					)}
					{feed.map((entry, i) => {
						if (entry.kind === 'activity') {
							return (
								<div
									key={`a-${i}`}
									style={{
										fontSize: 9,
										color: "#666",
										whiteSpace: "nowrap",
										overflow: "hidden",
										textOverflow: "ellipsis",
										lineHeight: "14px",
									}}
								>
									<span style={{ color: "#555" }}>{entry.time}</span>{" "}
									{entry.message}
								</div>
							);
						}
						const { msg } = entry;
						const ts = new Date(msg.createdAt);
						const time = `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}`;
						return (
							<div
								key={msg.id}
								style={{
									fontSize: 9,
									lineHeight: "14px",
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis",
								}}
							>
								<span style={{ color: "#555" }}>{time}</span>{" "}
								<span style={{ color: usernameColor(msg.username), fontWeight: "bold" }}>
									{msg.username}
								</span>
								<span style={{ color: "#555" }}>:</span>{" "}
								<span style={{ color: "#ccc" }}>
									{renderMessageContent(msg.content, msg.itemRefs)}
								</span>
							</div>
						);
					})}
				</div>

				{/* Input area */}
				{isOnline && (
					<div style={{ position: "relative" }}>
						{/* Autocomplete dropdown */}
						{showAutocomplete && autocompleteItems.length > 0 && (
							<div
								style={{
									position: "absolute",
									bottom: "100%",
									left: 0,
									right: 0,
									background: "#1a1a1a",
									border: "1px solid #444",
									borderRadius: 4,
									maxHeight: 120,
									overflow: "auto",
									zIndex: 100,
								}}
							>
								{autocompleteItems.map((x, i) => (
									<div
										key={x.id}
										onClick={() => selectAutocomplete(x.id, x.item.name)}
										style={{
											padding: "3px 8px",
											fontSize: 10,
											cursor: "pointer",
											background: i === autocompleteIndex ? "#333" : "transparent",
											color: ITEM_RARITY_COLORS[x.item.rarity],
										}}
									>
										{x.item.name}
										<span style={{ color: "#555", marginLeft: 4 }}>
											{RARITY_LABELS[x.item.rarity]}
										</span>
									</div>
								))}
							</div>
						)}
						<div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
							<input
								ref={inputRef}
								style={{ ...inputStyle, flex: 1, fontSize: 10 }}
								placeholder="Type a message... (@ for items)"
								value={input}
								onChange={handleInputChange}
								onKeyDown={handleKeyDown}
								maxLength={500}
							/>
							<button
								style={{
									...btnStyle,
									fontSize: 9,
									opacity: cooldown || !input.trim() ? 0.5 : 1,
								}}
								disabled={cooldown || !input.trim()}
								onClick={handleSend}
							>
								Send
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Item inspect overlay */}
			{inspectItem && (
				<ItemInspectOverlay
					itemId={inspectItem}
					onClose={() => setInspectItem(null)}
				/>
			)}
		</>
	);
}

// --- App ---

function App() {
	const [state, setState] = useState<AppState>({
		herzie: null,
		nowPlaying: null,
		multipliers: null,
		isOnline: false,
		isConnected: true,
		version: "",
	});
	const [view, setView] = useState<View>("home");
	const [tradeTarget, setTradeTarget] = useState<string | null>(null);
	const [activityLog, setActivityLog] = useState<{ time: string; message: string }[]>([]);
	const [deepLinkItem, setDeepLinkItem] = useState<string | null>(null);
	const [stageOverride, setStageOverride] = useState<number | null>(null);

	const addLog = useCallback((message: string) => {
		const now = new Date();
		const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
		setActivityLog((prev) => [...prev.slice(-49), { time, message }]);
	}, []);

	useEffect(() => {
		herzies.getState().then(setState);
		const unlistenState = herzies.onStateUpdate(setState);
		const unlistenActivity = herzies.onActivity(addLog);
		const unlistenDeepLink = herzies.onDeepLink((itemId) => {
			setDeepLinkItem(itemId);
			setView("inventory");
		});
		return () => {
			unlistenState();
			unlistenActivity();
			unlistenDeepLink();
		};
	}, []);

	// Reset to home screen when logging back in
	const prevOnline = useRef(state.isOnline);
	useEffect(() => {
		if (state.isOnline && !prevOnline.current) {
			setView("home");
		}
		prevOnline.current = state.isOnline;
	}, [state.isOnline]);

	const { herzie } = state;

	if (!state.isOnline) {
		return <SplashScreen />;
	}

	const switchView = (v: View) => {
		if (v !== "inventory") setDeepLinkItem(null);
		setView(v);
	};

	const handleStartTrade = (code: string) => {
		setTradeTarget(code);
		switchView("trade");
	};

	return (
		<div
			data-tauri-drag-region
			style={{
				padding: "12px 12px 4px",
				display: "flex",
				flexDirection: "column",
				height: "100vh",
			}}
		>
			<div
				style={{
					flex: 1,
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
					marginBottom: 8,
				}}
			>
				{view === "home" && <HomeView state={state} stageOverride={stageOverride} />}
				{view === "friends" && herzie && (
					<FriendsView herzie={herzie} onStartTrade={handleStartTrade} stageOverride={stageOverride} />
				)}
				{view === "inventory" && herzie && (
					<InventoryView
						herzie={herzie}
						initialItem={deepLinkItem}
						key={deepLinkItem ?? "inv"}
						onLog={addLog}
					/>
				)}
				{view === "events" && <EventsView />}
				{view === "trade" && herzie && (
					<TradeView
						herzie={herzie}
						initialTarget={tradeTarget}
						onClose={() => {
							setTradeTarget(null);
							setView("friends");
						}}
					/>
				)}
				{view === "settings" && <SettingsView state={state} stageOverride={stageOverride} onStageOverride={setStageOverride} />}
			</div>
			{herzie && (
				<ChatPanel activityLog={activityLog} isOnline={state.isOnline} />
			)}
			{herzie && <TabBar view={view} setView={switchView} />}
		</div>
	);
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
