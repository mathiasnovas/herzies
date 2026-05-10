import type { Herzie, HerzieProfile, Inventory, Trade } from "@herzies/shared";
import { levelProgress, xpToNextLevel } from "@herzies/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Herzie3D } from "./Herzie3D";
import { ItemDisplay } from "./ItemDisplay";
import {
	getItem,
	RARITY_COLORS as ITEM_RARITY_COLORS,
	RARITY_LABELS,
} from "./items";
import { type AppState, herzies } from "./tauri-bridge";

type View = "home" | "friends" | "inventory" | "trade" | "settings";

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
		{ id: "friends", label: "Friendzies" },
		{ id: "inventory", label: "Inventory" },
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

function HomeView({ state }: { state: AppState }) {
	const { herzie, nowPlaying, multipliers, isConnected } = state;

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
					stage={herzie.stage}
					isPlaying={!!nowPlaying}
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
}: {
	profile: HerzieProfile;
	onBack: () => void;
	onTrade: () => void;
	onRemove: () => void;
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
						stage={profile.stage}
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
}: {
	herzie: Herzie;
	onStartTrade: (code: string) => void;
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
				Friendzies ({herzie.friendCodes.length}/20)
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
			<div style={{ flex: 1, overflow: "auto" }}>
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

function InventoryView({ herzie, initialItem }: { herzie: Herzie; initialItem?: string | null }) {
	const [inventory, setInventory] = useState<Inventory | null>(null);
	const [currency, setCurrency] = useState(herzie.currency);
	const [loading, setLoading] = useState(true);
	const [selectedItem, setSelectedItem] = useState<string | null>(initialItem ?? null);

	const load = useCallback(async () => {
		const data = await herzies.fetchInventory();
		if (data) {
			setInventory(data.inventory);
			setCurrency(data.currency);
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

	const items = inventory
		? Object.entries(inventory).filter(([, qty]) => qty > 0)
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
				<div style={{ flex: 1, overflow: "auto" }}>
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

// --- Settings View ---

function SettingsView({ state }: { state: AppState }) {
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

			{/* Version */}
			<div style={{ marginTop: "auto", fontSize: 11, color: "#555" }}>
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
	const activityRef = useRef<HTMLDivElement>(null);
	const [deepLinkItem, setDeepLinkItem] = useState<string | null>(null);

	useEffect(() => {
		herzies.getState().then(setState);
		const unlistenState = herzies.onStateUpdate(setState);
		const unlistenActivity = herzies.onActivity((message) => {
			const now = new Date();
			const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
			setActivityLog((prev) => [...prev.slice(-49), { time, message }]);
		});
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

	useEffect(() => {
		activityRef.current?.scrollTo(0, activityRef.current.scrollHeight);
	}, [activityLog]);

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
				{view === "home" && <HomeView state={state} />}
				{view === "friends" && herzie && (
					<FriendsView herzie={herzie} onStartTrade={handleStartTrade} />
				)}
				{view === "inventory" && herzie && (
					<InventoryView
						herzie={herzie}
						initialItem={deepLinkItem}
						key={deepLinkItem ?? "inv"}
					/>
				)}
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
				{view === "settings" && <SettingsView state={state} />}
			</div>
			{herzie && activityLog.length > 0 && (
				<div
					ref={activityRef}
					style={{
						maxHeight: 42,
						overflow: "auto",
						borderTop: "1px solid #333",
						padding: "4px 0",
					}}
				>
					{activityLog.map((entry, i) => (
						<div
							key={`${entry.time}-${i}`}
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
					))}
				</div>
			)}
			{herzie && <TabBar view={view} setView={switchView} />}
		</div>
	);
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
