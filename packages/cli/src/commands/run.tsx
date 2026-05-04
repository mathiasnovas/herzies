import { Box, Text, render, useApp, useInput } from "ink";
import React, { useEffect, useRef, useState } from "react";
import type { Herzie, Stage } from "@herzies/shared";
import { type NowPlayingInfo, getNowPlaying } from "../music/nowplaying.js";
import { loadHerzie, saveHerzie } from "../storage/state.js";
import { isDaemonRunning } from "../storage/pid.js";
import { ensureDaemonRunning } from "../storage/daemon.js";
import { HerzieDisplay } from "../ui/HerzieDisplay.js";
import { StatsPanel } from "../ui/StatsPanel.js";

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

function RunApp() {
	const { exit } = useApp();
	const [herzie, setHerzie] = useState<Herzie | null>(null);
	const [currentTrack, setCurrentTrack] = useState<NowPlayingInfo | null>(null);
	const [daemonUp, setDaemonUp] = useState(false);
	const [events, setEvents] = useState<EventMessage[]>([]);
	const [tick, setTick] = useState(0);

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
			const [h, np] = await Promise.all([
				Promise.resolve(loadHerzie()),
				getNowPlaying(),
			]);

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

	useInput((_input, key) => {
		if (key.escape || (_input === "q") || (key.ctrl && _input === "c")) {
			exit();
		}
		if (_input === "b" && herzie) {
			herzie.boostUntil = Date.now() + 10000;
			saveHerzie(herzie);
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
				</Text>
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

				<StatsPanel herzie={herzie} />
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
				<Text dimColor>Press q or Esc to exit</Text>
			</Box>
		</Box>
	);
}

export function runApp() {
	render(<RunApp />);
}
