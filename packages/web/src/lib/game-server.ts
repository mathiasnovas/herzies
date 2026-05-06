import type { SupabaseClient } from "@supabase/supabase-js";
import {
	type Herzie,
	type ActiveMultiplier,
	type EventNotification,
	type PendingTradeRequest,
	type SecretTrackConfig,
	type Stage,
	applyXp,
	calculateXpGain,
	classifyGenre,
	getDailyCraving,
	matchesCraving,
	recordGenreMinutes,
	stageForLevel,
} from "@herzies/shared";

/** Normalize a track string for fuzzy matching */
function normalizeTrack(s: string): string {
	return s
		.toLowerCase()
		.replace(/\s*\(.*?\)\s*/g, "") // strip parenthetical: (Remastered), (feat. X)
		.replace(/\s*\[.*?\]\s*/g, "") // strip bracketed: [Deluxe Edition]
		.trim();
}

/** Check if a now_playing matches a secret track event config */
function matchesSecretTrack(
	title: string,
	artist: string,
	config: SecretTrackConfig,
): boolean {
	const normTitle = normalizeTrack(title);
	const normArtist = normalizeTrack(artist);
	const configTitle = normalizeTrack(config.trackTitle);
	const configArtist = normalizeTrack(config.trackArtist);

	return normTitle === configTitle && normArtist === configArtist;
}

/** Convert a Supabase herzie row to the shared Herzie type */
export function rowToHerzie(row: Record<string, unknown>): Herzie {
	return {
		id: row.id as string,
		name: row.name as string,
		createdAt: row.created_at as string,
		appearance: row.appearance as Herzie["appearance"],
		xp: row.xp as number,
		level: row.level as number,
		stage: row.stage as Stage,
		totalMinutesListened: row.total_minutes_listened as number,
		genreMinutes: (row.genre_minutes ?? {}) as Record<string, number>,
		friendCode: row.friend_code as string,
		friendCodes: (row.friend_codes ?? []) as string[],
		lastCravingDate: (row.last_craving_date ?? "") as string,
		lastCravingGenre: (row.last_craving_genre ?? "") as string,
		boostUntil: row.boost_until as number | undefined,
		streakDays: (row.streak_days ?? 0) as number,
		streakLastDate: (row.streak_last_date ?? null) as string | null,
		currency: (row.currency ?? 0) as number,
	};
}

/** Convert Herzie to DB update payload */
function herzieToRow(herzie: Herzie, nowPlaying: { title: string; artist: string } | null) {
	return {
		xp: Math.floor(herzie.xp),
		level: herzie.level,
		stage: herzie.stage,
		total_minutes_listened: herzie.totalMinutesListened,
		genre_minutes: herzie.genreMinutes,
		last_craving_date: herzie.lastCravingDate,
		last_craving_genre: herzie.lastCravingGenre,
		now_playing: nowPlaying,
		streak_days: herzie.streakDays,
		streak_last_date: herzie.streakLastDate,
		last_synced_at: new Date().toISOString(),
	};
}

/**
 * Process a sync request from the CLI daemon.
 * This is the core game loop — server is the authority for XP and items.
 */
interface MultiplierSchedule {
	days: number[];     // 0=Sunday, 1=Monday, ..., 6=Saturday
	hourStart: number;  // 0-23
	hourEnd: number;    // 1-24 (exclusive)
}

/** Check if a schedule-based multiplier is active right now */
function isScheduleActive(schedule: MultiplierSchedule, now: Date): boolean {
	const day = now.getDay();
	const hour = now.getHours();
	return schedule.days.includes(day) && hour >= schedule.hourStart && hour < schedule.hourEnd;
}

/** Fetch active multipliers from DB, evaluating both date-range and schedule-based */
async function fetchServerMultipliers(admin: SupabaseClient, now: Date): Promise<ActiveMultiplier[]> {
	const nowStr = now.toISOString();
	const { data } = await admin
		.from("multipliers")
		.select("name, bonus, schedule")
		.eq("active", true)
		.lte("starts_at", nowStr)
		.gte("ends_at", nowStr);

	if (!data) return [];

	return data
		.filter((m) => {
			// If no schedule, it's a simple date-range multiplier (always active within the range)
			if (!m.schedule) return true;
			// If schedule exists, check if the current time matches the recurring pattern
			return isScheduleActive(m.schedule as MultiplierSchedule, now);
		})
		.map((m) => ({ name: m.name as string, bonus: m.bonus as number }));
}

interface SyncOptions {
	/** "cli" (default) applies wall-clock and per-sync caps. "spotify" skips them (dedup via play log). */
	source?: "cli" | "spotify";
}

export async function processSync(
	admin: SupabaseClient,
	userId: string,
	nowPlaying: { title: string; artist: string; genre?: string } | null,
	minutesListened: number,
	genres: string[],
	options: SyncOptions = {},
): Promise<{ herzie: Herzie; notifications: EventNotification[]; multipliers: ActiveMultiplier[]; pendingTradeRequest?: PendingTradeRequest }> {
	const source = options.source ?? "cli";
	// 1. Fetch the herzie
	const { data: row, error } = await admin
		.from("herzies")
		.select("*")
		.eq("user_id", userId)
		.single();

	if (error || !row) {
		throw new Error("Herzie not found for this user");
	}

	const herzie = rowToHerzie(row);
	const notifications: EventNotification[] = [];
	const now = new Date();
	const today = now.toISOString().slice(0, 10);

	// 2. Update daily streak (if user is listening)
	if (minutesListened > 0 && herzie.streakLastDate !== today) {
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayStr = yesterday.toISOString().slice(0, 10);

		if (herzie.streakLastDate === yesterdayStr) {
			// Consecutive day — extend streak
			herzie.streakDays += 1;
		} else if (herzie.streakLastDate === today) {
			// Already counted today — no change
		} else {
			// Streak broken — reset to 1
			herzie.streakDays = 1;
		}
		herzie.streakLastDate = today;

		if (herzie.streakDays > 1) {
			notifications.push({
				type: "info",
				title: "Streak!",
				message: `${herzie.streakDays}-day streak! +${herzie.streakDays}% XP`,
			});
		}
	}

	// 3. Gather all active multipliers from DB (includes migrated time-based ones)
	const serverMultipliers = await fetchServerMultipliers(admin, now);

	// Add BOOST if active (stored on the herzie, not in multipliers table)
	const allMultipliers = [...serverMultipliers];
	if (herzie.boostUntil && now.getTime() < herzie.boostUntil) {
		allMultipliers.push({ name: "BOOST", bonus: 10.0 });
	}

	// Add streak bonus (1% per day)
	if (herzie.streakDays > 0) {
		allMultipliers.push({ name: `${herzie.streakDays}-day streak`, bonus: herzie.streakDays * 0.01 });
	}

	// 4. Calculate and apply XP (server-authoritative)
	if (minutesListened > 0) {
		const classifiedGenres = genres.length > 0 ? classifyGenre(genres) : classifyGenre(["pop"]);
		const craving = getDailyCraving(herzie.id);
		const isCraving = genres.length > 0 && matchesCraving(genres, craving);

		let minutes = minutesListened;

		// CLI sync: cap to prevent abuse via rapid requests
		if (source === "cli") {
			// Cap at 10 minutes per sync hard limit
			minutes = Math.min(minutes, 10);

			// Cap to actual elapsed wall-clock time since last sync (+1 min grace)
			const lastSyncedAt = row.last_synced_at as string | null;
			if (lastSyncedAt) {
				const elapsedMs = now.getTime() - new Date(lastSyncedAt).getTime();
				const elapsedMinutes = Math.max(0, elapsedMs / 60_000);
				minutes = Math.min(minutes, elapsedMinutes + 1);
			}
		}
		// Spotify source: no caps — deduplication handled by spotify_play_log

		const xp = calculateXpGain(
			minutes,
			herzie.friendCodes.length,
			isCraving,
			undefined, // no boostUntil — it's in allMultipliers now
			allMultipliers,
		);

		const events = applyXp(herzie, xp);
		herzie.totalMinutesListened += minutes;
		recordGenreMinutes(herzie.genreMinutes, classifiedGenres, minutes);

		if (events.leveledUp) {
			notifications.push({
				type: "info",
				title: "Level Up!",
				message: `${herzie.name} is now level ${herzie.level}!`,
			});
		}
		if (events.evolved && events.newStage) {
			notifications.push({
				type: "info",
				title: "Evolution!",
				message: `${herzie.name} evolved to stage ${events.newStage}!`,
			});
		}
	}

	// 5. Grant CDs based on total listening time
	const totalCdsEarned = Math.floor(herzie.totalMinutesListened / 10);
	const cdsGranted = (row.cds_granted ?? 0) as number;
	const newCds = totalCdsEarned - cdsGranted;

	if (newCds > 0) {
		await admin.rpc("grant_cds", {
			p_user_id: userId,
			p_quantity: newCds,
			p_cds_granted: totalCdsEarned,
		});

		notifications.push({
			type: "item_granted",
			title: "CD",
			message: `You earned ${newCds} CD${newCds > 1 ? "s" : ""}!`,
			itemId: "cd",
			quantity: newCds,
		});
	}

	// 6. Check for secret track events (CLI only — requires real-time now_playing)
	if (source === "cli" && nowPlaying) {
		const eventNotifications = await checkSecretTrackEvents(
			admin,
			userId,
			nowPlaying.title,
			nowPlaying.artist,
		);
		notifications.push(...eventNotifications);
	}

	// 7. Update the herzie in DB
	// Spotify catch-up: don't overwrite now_playing (it may be stale)
	const npPayload = source === "cli" && nowPlaying
		? { title: nowPlaying.title, artist: nowPlaying.artist }
		: null;
	const updateData = herzieToRow(herzie, npPayload);
	if (source === "spotify") {
		// Don't overwrite now_playing for spotify catch-up
		delete (updateData as Record<string, unknown>).now_playing;
	}
	await admin
		.from("herzies")
		.update(updateData)
		.eq("user_id", userId);

	// 8. Check for pending trade requests
	let pendingTradeRequest: { tradeId: string; fromName: string; fromFriendCode: string } | undefined;
	const { data: pendingTrade } = await admin
		.from("trades")
		.select("id, initiator_id")
		.eq("target_id", userId)
		.eq("state", "pending")
		.gt("expires_at", new Date().toISOString())
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (pendingTrade) {
		const { data: initiator } = await admin
			.from("herzies")
			.select("name, friend_code")
			.eq("user_id", pendingTrade.initiator_id)
			.single();

		if (initiator) {
			pendingTradeRequest = {
				tradeId: pendingTrade.id as string,
				fromName: initiator.name as string,
				fromFriendCode: initiator.friend_code as string,
			};
		}
	}

	return { herzie, notifications, multipliers: allMultipliers, pendingTradeRequest };

}

/**
 * Check if the currently playing track matches any active secret track events.
 * If it does and the user hasn't claimed it yet, grant the reward.
 */
async function checkSecretTrackEvents(
	admin: SupabaseClient,
	userId: string,
	title: string,
	artist: string,
): Promise<EventNotification[]> {
	const notifications: EventNotification[] = [];
	const now = new Date().toISOString();

	// Fetch active secret track events
	const { data: events } = await admin
		.from("events")
		.select("*")
		.eq("type", "secret_track")
		.eq("active", true)
		.lte("starts_at", now)
		.gte("ends_at", now);

	if (!events || events.length === 0) return notifications;

	for (const event of events) {
		const config = event.config as SecretTrackConfig;
		if (!matchesSecretTrack(title, artist, config)) continue;

		// Check total claims against maxClaims
		const { count: totalClaims } = await admin
			.from("event_claims")
			.select("*", { count: "exact", head: true })
			.eq("event_id", event.id);

		if ((totalClaims ?? 0) >= config.maxClaims) continue;

		// Check if this user already claimed
		const { data: existingClaim } = await admin
			.from("event_claims")
			.select("id")
			.eq("event_id", event.id)
			.eq("user_id", userId)
			.single();

		if (existingClaim) continue;

		// Grant the reward!
		const { error: claimError } = await admin
			.from("event_claims")
			.insert({ event_id: event.id, user_id: userId });

		if (claimError) continue; // race condition — someone else claimed first

		// Add item to inventory_v2 atomically
		await admin.rpc("grant_inventory_item", {
			p_user_id: userId,
			p_item_id: config.rewardItemId,
			p_quantity: 1,
		});

		notifications.push({
			type: "item_granted",
			title: config.rewardItemId,
			message: `You discovered the secret track "${config.trackTitle}"! You earned a collectible!`,
			itemId: config.rewardItemId,
			quantity: 1,
		});
	}

	return notifications;
}
