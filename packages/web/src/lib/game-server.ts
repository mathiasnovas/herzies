import type { SupabaseClient } from "@supabase/supabase-js";
import {
	type Herzie,
	type EventNotification,
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
	};
}

/**
 * Process a sync request from the CLI daemon.
 * This is the core game loop — server is the authority for XP and items.
 */
export async function processSync(
	admin: SupabaseClient,
	userId: string,
	nowPlaying: { title: string; artist: string; genre?: string } | null,
	minutesListened: number,
	genres: string[],
): Promise<{ herzie: Herzie; notifications: EventNotification[] }> {
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

	// 2. Calculate and apply XP (server-authoritative)
	if (minutesListened > 0) {
		const classifiedGenres = genres.length > 0 ? classifyGenre(genres) : classifyGenre(["pop"]);
		const craving = getDailyCraving(herzie.id);
		const isCraving = genres.length > 0 && matchesCraving(genres, craving);

		// Cap at 10 minutes per sync to prevent abuse, but allow offline backlog
		const minutes = Math.min(minutesListened, 10);

		const xp = calculateXpGain(
			minutes,
			herzie.friendCodes.length,
			isCraving,
			herzie.boostUntil,
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

	// 3. Check for secret track events
	if (nowPlaying) {
		const eventNotifications = await checkSecretTrackEvents(
			admin,
			userId,
			nowPlaying.title,
			nowPlaying.artist,
			herzie,
		);
		notifications.push(...eventNotifications);
	}

	// 4. Update the herzie in DB
	const npPayload = nowPlaying ? { title: nowPlaying.title, artist: nowPlaying.artist } : null;
	await admin
		.from("herzies")
		.update(herzieToRow(herzie, npPayload))
		.eq("user_id", userId);

	return { herzie, notifications };
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
	herzie: Herzie,
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

		// Add item to inventory
		const currentInventory = (herzie as unknown as { inventory?: string[] }).inventory ?? [];
		if (!currentInventory.includes(config.rewardItemId)) {
			await admin
				.from("herzies")
				.update({
					inventory: [...currentInventory, config.rewardItemId],
				})
				.eq("user_id", userId);
		}

		notifications.push({
			type: "item_granted",
			title: "Secret Track Found!",
			message: `You discovered the secret track "${config.trackTitle}"! You earned a collectible!`,
			itemId: config.rewardItemId,
		});
	}

	return notifications;
}
