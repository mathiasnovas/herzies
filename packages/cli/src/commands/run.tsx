import { Box, Text, render, useApp, useInput } from "ink";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	type Herzie,
	type Stage,
	getDailyCraving,
	matchesCraving,
	applyXp,
	calculateXpGain,
	levelProgress,
	xpToNextLevel,
	classifyGenre,
	recordGenreMinutes,
} from "@herzies/shared";
import { type NowPlayingInfo, getNowPlaying } from "../music/nowplaying.js";
import { syncHerzie } from "../storage/supabase.js";
import { loadHerzie, saveHerzie } from "../storage/state.js";
import { HerzieDisplay } from "../ui/HerzieDisplay.js";

const POLL_INTERVAL = 3000; // 3 seconds — native osascript call is fast

interface SessionState {
	sessionXp: number;
	sessionMinutes: number;
	tracksPlayed: number;
	currentTrack: NowPlayingInfo | null;
	connected: boolean;
	online: boolean;
	events: EventMessage[];
}

interface EventMessage {
	text: string;
	color: string;
	time: number;
}

const STAGE_NAMES: Record<Stage, string> = {
	1: "Baby",
	2: "Teen",
	3: "Champion",
};

function XpBar({ progress, width = 20 }: { progress: number; width?: number }) {
	const filled = Math.round(progress * width);
	const empty = width - filled;
	const bar = "█".repeat(filled) + "░".repeat(empty);
	return (
		<Text>
			<Text color="green">[{bar}]</Text>{" "}
			<Text color="yellow">{Math.round(progress * 100)}%</Text>
		</Text>
	);
}

function getTopGenres(
	genreMinutes: Record<string, number>,
): [string, number][] {
	return Object.entries(genreMinutes)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 3);
}

function RunApp() {
	const { exit } = useApp();
	const [herzie, setHerzie] = useState<Herzie | null>(null);
	const [session, setSession] = useState<SessionState>({
		sessionXp: 0,
		sessionMinutes: 0,
		tracksPlayed: 0,
		currentTrack: null,
		connected: false,
		online: false,
		events: [],
	});
	const [tick, setTick] = useState(0);
	const lastPollTime = useRef<number>(Date.now());
	const lastTrackTitle = useRef<string>("");
	const herzieRef = useRef<Herzie | null>(null);

	const pushEvent = useCallback((text: string, color: string) => {
		setSession((s) => ({
			...s,
			events: [...s.events.slice(-4), { text, color, time: Date.now() }],
		}));
	}, []);

	const poll = useCallback(async () => {
		const h = herzieRef.current;
		if (!h) return;

		const np = await getNowPlaying();

		if (!np || !np.isPlaying || !np.title || np.volume === 0) {
			setSession((s) => ({ ...s, currentTrack: null, connected: true }));
			lastPollTime.current = Date.now();
			return;
		}

		const now = Date.now();
		const minutesSinceLastPoll = (now - lastPollTime.current) / 60000;
		lastPollTime.current = now;
		const minutes = Math.min(minutesSinceLastPoll, 1);

		// Detect new track
		const trackKey = `${np.title}-${np.artist}`;
		const isNewTrack = trackKey !== lastTrackTitle.current;
		if (isNewTrack) {
			lastTrackTitle.current = trackKey;
		}

		if (minutes > 0.01) {
			// Use the genre from Now Playing if available, otherwise infer from genre field
			const genreList = np.genre ? [np.genre] : [];
			const genres = genreList.length > 0 ? classifyGenre(genreList) : classifyGenre(["pop"]);
			const craving = getDailyCraving(h.id);
			const isCraving = genreList.length > 0 && matchesCraving(genreList, craving);

			const xp = calculateXpGain(
				minutes,
				h.friendCodes.length,
				isCraving,
			);

			const events = applyXp(h, xp);
			h.totalMinutesListened += minutes;
			recordGenreMinutes(h.genreMinutes, genres, minutes);
			saveHerzie(h);

			if (isCraving) {
				pushEvent(
					`♫ Craving bonus! ${h.name} loves this ${craving}!`,
					"yellow",
				);
			}

			if (events.leveledUp) {
				pushEvent(
					`⬆ LEVEL UP! ${h.name} is now level ${h.level}!`,
					"yellow",
				);
			}

			if (events.evolved && events.newStage) {
				pushEvent(
					`✨ ${h.name} EVOLVED to ${STAGE_NAMES[events.newStage]} (Stage ${events.newStage})!`,
					"magenta",
				);
			}

			setHerzie({ ...h });
			setSession((s) => ({
				...s,
				sessionXp: s.sessionXp + xp,
				sessionMinutes: s.sessionMinutes + minutes,
				tracksPlayed: isNewTrack
					? s.tracksPlayed + 1
					: s.tracksPlayed,
				currentTrack: np,
			}));
		} else {
			setSession((s) => ({ ...s, currentTrack: np }));
		}
	}, [pushEvent]);

	// Load herzie on mount
	useEffect(() => {
		const h = loadHerzie();
		if (!h) return;
		herzieRef.current = h;
		setHerzie(h);
	}, []);

	// Sync to Supabase every 10 seconds
	useEffect(() => {
		if (!herzie) return;
		const sync = async () => {
			const h = herzieRef.current;
			if (!h) return;
			const ok = await syncHerzie(h);
			setSession((s) => ({ ...s, online: ok }));
		};
		sync();
		const interval = setInterval(sync, 10000);
		return () => clearInterval(interval);
	}, [herzie !== null]);

	// Polling loop
	useEffect(() => {
		if (!herzie) return;
		poll();
		const interval = setInterval(poll, POLL_INTERVAL);
		return () => clearInterval(interval);
	}, [herzie !== null, poll]);

	// Animated tick for the idle indicator
	useEffect(() => {
		const t = setInterval(() => setTick((n) => n + 1), 1000);
		return () => clearInterval(t);
	}, []);

	useInput((_input, key) => {
		if (key.escape || (_input === "q") || (key.ctrl && _input === "c")) {
			exit();
		}
	});

	// No herzie state
	if (!herzie) {
		return (
			<Box padding={1}>
				<Text color="yellow">
					No Herzie found! Run <Text bold>herzies hatch</Text> to get started.
				</Text>
			</Box>
		);
	}

	const progress = levelProgress(herzie);
	const toNext = xpToNextLevel(herzie);
	const topGenres = getTopGenres(herzie.genreMinutes);
	const craving = getDailyCraving(herzie.id);
	const totalHours = (herzie.totalMinutesListened / 60).toFixed(1);
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
					— {session.currentTrack ? "listening" : `idle${dots}`}
				</Text>
				<Text>
					{" "}
					{session.online ? (
						<Text color="green">[online]</Text>
					) : (
						<Text dimColor>[offline]</Text>
					)}
				</Text>
			</Box>

			{/* Main layout: Herzie art + stats */}
			<Box marginTop={1} flexDirection="row">
				{/* Left: ASCII art */}
				<Box flexDirection="column" marginRight={2}>
					<HerzieDisplay
						appearance={herzie.appearance}
						stage={herzie.stage}
						dancing={session.currentTrack !== null}
					/>
				</Box>

				{/* Right: Stats */}
				<Box flexDirection="column">
					{/* Name & stage */}
					<Box>
						<Text bold color="cyan">
							{herzie.name}
						</Text>
						<Text dimColor>
							{" "}
							— {STAGE_NAMES[herzie.stage]} (Stage{" "}
							{herzie.stage})
						</Text>
					</Box>

					{/* Level + XP */}
					<Box marginTop={1}>
						<Text>
							<Text bold>Level:</Text>{" "}
							<Text color="yellow">{herzie.level}</Text>
						</Text>
					</Box>
					<Box>
						<Text bold>XP: </Text>
						<XpBar progress={progress} />
						<Text dimColor> ({Math.ceil(toNext)} to next)</Text>
					</Box>

					{/* Music stats */}
					<Box marginTop={1}>
						<Text bold>Music: </Text>
						<Text color="magenta">
							{totalHours}h ({Math.floor(herzie.totalMinutesListened)} min)
						</Text>
					</Box>

					{/* Top genres */}
					{topGenres.length > 0 && (
						<Box flexDirection="column">
							<Text bold>Genres:</Text>
							{topGenres.map(([genre, minutes], i) => (
								<Box key={genre} paddingLeft={1}>
									<Text>
										{["1.", "2.", "3."][i]}{" "}
										<Text color="white">{genre}</Text>{" "}
										<Text dimColor>
											({Math.floor(minutes)} min)
										</Text>
									</Text>
								</Box>
							))}
						</Box>
					)}

					{/* Craving */}
					<Box marginTop={1}>
						<Text bold>Craving: </Text>
						<Text color="yellow">"{craving}"</Text>
						<Text dimColor> +50% XP</Text>
					</Box>

					{/* Friend code */}
					<Box>
						<Text bold>Code: </Text>
						<Text color="cyan">{herzie.friendCode}</Text>
						<Text dimColor>
							{" "}
							({herzie.friendCodes.length} friendzie
							{herzie.friendCodes.length !== 1 ? "s" : ""}
							{herzie.friendCodes.length > 0
								? `, +${Math.min(herzie.friendCodes.length, 20) * 2}% XP`
								: ""}
							)
						</Text>
					</Box>
				</Box>
			</Box>

			{/* Now playing */}
			<Box marginTop={1} flexDirection="column">
				{session.currentTrack ? (
					<Box>
						<Text color="green" bold>
							♪{" "}
						</Text>
						<Text bold>{session.currentTrack.title}</Text>
						<Text dimColor>
							{" "}
							— {session.currentTrack.artist}
						</Text>
						{session.currentTrack.genre ? (
							<Text dimColor>
								{" "}
								[{session.currentTrack.genre}]
							</Text>
						) : null}
						<Text dimColor>
							{" "}
							| +{Math.floor(session.sessionXp)} XP this session
						</Text>
					</Box>
				) : (
					<Text dimColor>
						♪ No music playing — play something to earn XP!
					</Text>
				)}
			</Box>

			{/* Event log */}
			{session.events.length > 0 && (
				<Box marginTop={1} flexDirection="column">
					{session.events
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
