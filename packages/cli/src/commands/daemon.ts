/**
 * Headless background daemon that polls for music and accumulates XP
 * without requiring an open terminal window.
 *
 * Spawned by `herzies start`, stopped by `herzies stop`.
 */

import {
	type Herzie,
	getDailyCraving,
	matchesCraving,
	applyXp,
	calculateXpGain,
	classifyGenre,
	recordGenreMinutes,
} from "@herzies/shared";
import { getNowPlaying } from "../music/nowplaying.js";
import { syncHerzie, syncNowPlaying, pullFriendCodes } from "../storage/supabase.js";
import { loadHerzie, saveHerzie } from "../storage/state.js";
import { writePid, clearPid, loadPid } from "../storage/pid.js";

const POLL_INTERVAL = 3000;
const SYNC_INTERVAL = 10000;

let lastPollTime = Date.now();
let lastTrackTitle = "";
let currentNowPlaying: { title: string; artist: string } | null = null;

function log(msg: string) {
	const ts = new Date().toISOString();
	process.stderr.write(`[${ts}] ${msg}\n`);
}

async function poll(herzie: Herzie): Promise<void> {
	const np = await getNowPlaying();

	if (!np || !np.isPlaying || !np.title || np.volume === 0) {
		currentNowPlaying = null;
		lastPollTime = Date.now();
		return;
	}

	currentNowPlaying = { title: np.title, artist: np.artist };

	const now = Date.now();
	const minutesSinceLastPoll = (now - lastPollTime) / 60000;
	lastPollTime = now;
	const minutes = Math.min(minutesSinceLastPoll, 1);

	const trackKey = `${np.title}-${np.artist}`;
	if (trackKey !== lastTrackTitle) {
		lastTrackTitle = trackKey;
		log(`♪ ${np.title} — ${np.artist}`);
	}

	if (minutes > 0.01) {
		const genreList = np.genre ? [np.genre] : [];
		const genres =
			genreList.length > 0
				? classifyGenre(genreList)
				: classifyGenre(["pop"]);
		const craving = getDailyCraving(herzie.id);
		const isCraving = genreList.length > 0 && matchesCraving(genreList, craving);

		const xp = calculateXpGain(
			minutes,
			herzie.friendCodes.length,
			isCraving,
		);

		// Re-read from disk to pick up changes from other commands (e.g. friends add)
		const fresh = loadHerzie();
		if (fresh) {
			herzie.friendCodes = fresh.friendCodes;
			herzie.friendCode = fresh.friendCode;
			herzie.name = fresh.name;
		}

		const events = applyXp(herzie, xp);
		herzie.totalMinutesListened += minutes;
		recordGenreMinutes(herzie.genreMinutes, genres, minutes);
		saveHerzie(herzie);

		if (events.leveledUp) {
			log(`⬆ LEVEL UP! ${herzie.name} is now level ${herzie.level}!`);
		}
		if (events.evolved && events.newStage) {
			log(`✨ ${herzie.name} EVOLVED to Stage ${events.newStage}!`);
		}
	}
}

let syncCount = 0;

async function syncLoop(herzie: Herzie) {
	const ok = await syncHerzie(herzie, currentNowPlaying);
	if (ok) log("synced");

	// Pull friend updates every 6th sync (~60s) to pick up adds/removes by others
	syncCount++;
	if (syncCount % 6 === 0) {
		await pullFriendCodes(herzie).catch(() => {});
	}
}

async function main() {
	// Check if another daemon is already running
	const existingPid = loadPid();
	if (existingPid !== null) {
		try {
			process.kill(existingPid, 0); // test if alive
			log(`daemon already running (pid ${existingPid}), exiting`);
			process.exit(1);
		} catch {
			// stale pid file, we'll take over
		}
	}

	const herzie = loadHerzie();
	if (!herzie) {
		log("no herzie found — run `herzies hatch` first");
		process.exit(1);
	}

	writePid(process.pid);
	log(`daemon started (pid ${process.pid}) for ${herzie.name}`);

	// Graceful shutdown — clear now_playing so leaderboard shows idle
	const cleanup = async () => {
		log("daemon stopping");
		currentNowPlaying = null;
		await syncNowPlaying(null).catch(() => {});
		clearPid();
		process.exit(0);
	};
	process.on("SIGTERM", cleanup);
	process.on("SIGINT", cleanup);

	// Music polling loop
	setInterval(() => {
		poll(herzie).catch((err) => log(`poll error: ${err}`));
	}, POLL_INTERVAL);

	// Sync loop
	syncLoop(herzie).catch(() => {});
	setInterval(() => {
		syncLoop(herzie).catch(() => {});
	}, SYNC_INTERVAL);

	// Initial poll
	poll(herzie).catch(() => {});
}

main();
