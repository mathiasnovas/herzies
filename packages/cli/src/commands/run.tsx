import { Box, Text, render, useApp, useInput } from "ink";
import React, { useEffect, useRef, useState } from "react";
import type { Herzie, Stage, ActiveMultiplier } from "@herzies/shared";
import { type NowPlayingInfo, getNowPlaying } from "../music/nowplaying.js";
import { loadHerzie, saveHerzie, loadMultipliers } from "../storage/state.js";
import { isDaemonRunning } from "../storage/pid.js";
import { ensureDaemonRunning } from "../storage/daemon.js";
import { HerzieDisplay } from "../ui/HerzieDisplay.js";
import { StatsPanel } from "../ui/StatsPanel.js";
import { InventoryView } from "../ui/InventoryView.js";
import { checkOnline } from "../storage/api.js";

const REFRESH_INTERVAL = 3000;

const STAGE_NAMES: Record<Stage, string> = {
	1: "Baby",
	2: "Teen",
	3: "Champion",
};

interface EventMessage {
	text: string;
	color: string;
	time: number;
}

type View = "dashboard" | "inventory";

function RunApp() {
	const { exit } = useApp();
	const [herzie, setHerzie] = useState<Herzie | null>(null);
	const [currentTrack, setCurrentTrack] = useState<NowPlayingInfo | null>(null);
	const [daemonUp, setDaemonUp] = useState(false);
	const [events, setEvents] = useState<EventMessage[]>([]);
	const [tick, setTick] = useState(0);
	const [online, setOnline] = useState<boolean | undefined>(undefined);
	const [multipliers, setMultipliers] = useState<ActiveMultiplier[] | undefined>(undefined);

	// View state
	const [view, setView] = useState<View>("dashboard");

	const startXp = useRef<number>(0);
	const prevLevel = useRef<number>(0);
	const prevStage = useRef<Stage>(1);

	const pushEvent = (text: string, color: string) => {
		setEvents((prev) => [...prev.slice(-4), { text, color, time: Date.now() }]);
	};

	// Auto-start daemon on mount
	useEffect(() => {
		const h = loadHerzie();
		if (!h) return;

		startXp.current = h.xp;
		prevLevel.current = h.level;
		prevStage.current = h.stage;
		setHerzie(h);

		if (!isDaemonRunning()) {
			ensureDaemonRunning();
		}
		setDaemonUp(true);
	}, []);

	// Refresh loop: re-read herzie state from disk + query now playing
	useEffect(() => {
		if (!daemonUp) return;

		const refresh = async () => {
			const [h, np, isOnline] = await Promise.all([
				Promise.resolve(loadHerzie()),
				getNowPlaying(),
				checkOnline(),
			]);
			setOnline(isOnline);
			setMultipliers(loadMultipliers() ?? undefined);

			if (h) {
				// Detect level-ups and evolutions from daemon's writes
				if (h.level > prevLevel.current) {
					pushEvent(
						`⬆ LEVEL UP! ${h.name} is now level ${h.level}!`,
						"yellow",
					);
				}
				if (h.stage > prevStage.current) {
					pushEvent(
						`✨ ${h.name} EVOLVED to ${STAGE_NAMES[h.stage]} (Stage ${h.stage})!`,
						"magenta",
					);
				}
				prevLevel.current = h.level;
				prevStage.current = h.stage;
				setHerzie(h);
			}

			const playing = np?.isPlaying && np.title && np.volume > 0 ? np : null;
			setCurrentTrack(playing);
		};

		refresh();
		const interval = setInterval(refresh, REFRESH_INTERVAL);
		return () => clearInterval(interval);
	}, [daemonUp]);

	// Animated tick for the idle indicator
	useEffect(() => {
		const t = setInterval(() => setTick((n) => n + 1), 1000);
		return () => clearInterval(t);
	}, []);

	// Update terminal tab title
	useEffect(() => {
		const name = herzie?.name ?? "herzies";
		const status = currentTrack
			? `♪ ${currentTrack.title} — ${currentTrack.artist}`
			: "idle";
		const conn = online === false ? "offline" : "";
		const parts = [name, status, conn].filter(Boolean);
		process.stdout.write(`\x1b]0;${parts.join(" · ")}\x07`);

		return () => {
			process.stdout.write(`\x1b]0;\x07`);
		};
	}, [herzie?.name, currentTrack, online]);

	useInput((_input, key) => {
		if (view !== "dashboard") return;

		if (key.escape || _input === "q" || (key.ctrl && _input === "c")) {
			exit();
		}
		if (_input === "b" && herzie) {
			herzie.boostUntil = Date.now() + 10000;
			saveHerzie(herzie);
		}
		if (_input === "i" && herzie) {
			setView("inventory");
		}
	});

	if (!herzie) {
		return (
			<Box padding={1}>
				<Text color="yellow">
					No Herzie found! Run <Text bold>herzies hatch</Text> to get started.
				</Text>
			</Box>
		);
	}

	// --- Inventory view ---
	if (view === "inventory") {
		return (
			<InventoryView
				herzie={herzie}
				onBack={() => setView("dashboard")}
				online={online}
			/>
		);
	}

	// --- Dashboard view ---
	const sessionXp = Math.floor(herzie.xp - startXp.current);
	const dots = ".".repeat((tick % 3) + 1).padEnd(3);

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box>
				<Text bold color="magenta">
					♫ herzies
				</Text>
				<Text dimColor>
					{" "}
					— {currentTrack ? "listening" : `idle${dots}`}
					{" "}
				</Text>
				{online !== undefined && (
					<Text>
						<Text color={online ? "green" : "red"}>
							[{online ? "online" : "offline"}]
						</Text>
						{online === false && (
							<Text dimColor> xp syncs when back online</Text>
						)}
					</Text>
				)}
			</Box>

			{/* Main layout: Herzie art + stats */}
			<Box marginTop={1} flexDirection="row">
				<Box flexDirection="column" marginRight={2}>
					<HerzieDisplay
						appearance={herzie.appearance}
						stage={herzie.stage}
						dancing={currentTrack !== null}
					/>
				</Box>

				<StatsPanel herzie={herzie} multipliers={multipliers} />
			</Box>

			{/* Now playing */}
			<Box marginTop={1} flexDirection="column">
				{currentTrack ? (
					<Box>
						<Text color="green" bold>
							♪{" "}
						</Text>
						<Text bold>{currentTrack.title}</Text>
						<Text dimColor>
							{" "}
							— {currentTrack.artist}
						</Text>
						{sessionXp > 0 && (
							<Text dimColor>
								{" "}
								| +{sessionXp} XP this session
							</Text>
						)}
					</Box>
				) : (
					<Text dimColor>
						♪ No music playing — play something to earn XP!
					</Text>
				)}
			</Box>

			{/* Event log */}
			{events.length > 0 && (
				<Box marginTop={1} flexDirection="column">
					{events
						.filter((e) => Date.now() - e.time < 30000)
						.map((e, i) => (
							<Text key={`${e.time}-${i}`} color={e.color}>
								{e.text}
							</Text>
						))}
				</Box>
			)}

			{/* Footer */}
			<Box marginTop={1}>
				<Text dimColor>Press q to exit · i for inventory</Text>
			</Box>
		</Box>
	);
}

export function runApp() {
	render(<RunApp />);
}
