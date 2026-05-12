import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChatPanel } from "./components/ChatPanel";
import { EventsView } from "./components/EventsView";
import { FriendsView } from "./components/FriendsView";
import { HomeView } from "./components/HomeView";
import { InventoryView } from "./components/InventoryView";
import { SettingsView } from "./components/SettingsView";
import { SplashScreen } from "./components/SplashScreen";
import { TabBar, type View } from "./components/TabBar";
import { TradeView } from "./components/TradeView";
import { type AppState, herzies } from "./tauri-bridge";

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
	const [activityLog, setActivityLog] = useState<
		{ time: string; message: string }[]
	>([]);
	const [deepLinkItem, setDeepLinkItem] = useState<string | null>(null);
	const [stageOverride, setStageOverride] = useState<number | null>(null);

	const addLog = useCallback((message: string) => {
		const time = new Date().toISOString();
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
				{view === "home" && (
					<HomeView state={state} stageOverride={stageOverride} />
				)}
				{view === "friends" && herzie && (
					<FriendsView
						herzie={herzie}
						onStartTrade={handleStartTrade}
						stageOverride={stageOverride}
					/>
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
				{view === "settings" && (
					<SettingsView
						state={state}
						stageOverride={stageOverride}
						onStageOverride={setStageOverride}
					/>
				)}
			</div>
			{herzie && view === "home" && (
				<ChatPanel activityLog={activityLog} isOnline={state.isOnline} />
			)}
			{herzie && <TabBar view={view} setView={switchView} />}
		</div>
	);
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
