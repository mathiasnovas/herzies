export interface HerzieAppearance {
	headIndex: number;
	eyesIndex: number;
	mouthIndex: number;
	accessoryIndex: number;
	limbsIndex: number;
	bodyIndex: number;
	legsIndex: number;
	colorScheme: ColorScheme;
}

export type ColorScheme =
	| "pink"
	| "blue"
	| "green"
	| "purple"
	| "orange"
	| "yellow"
	| "cyan"
	| "red";

export type Stage = 1 | 2 | 3;

export interface Herzie {
	id: string;
	name: string;
	createdAt: string;

	appearance: HerzieAppearance;

	// Progression
	xp: number;
	level: number;
	stage: Stage;

	// Music stats
	totalMinutesListened: number;
	genreMinutes: Record<string, number>;

	// Social
	friendCode: string;
	friendCodes: string[];

	// Craving
	lastCravingDate: string;
	lastCravingGenre: string;

	// Boosts
	boostUntil?: number;
}

export interface HerzieProfile {
	name: string;
	friendCode: string;
	stage: number;
	level: number;
}

export const GENRES = [
	"pop",
	"rock",
	"hip-hop",
	"electronic",
	"jazz",
	"classical",
	"r&b",
	"country",
	"metal",
	"indie",
	"latin",
	"folk",
	"blues",
	"punk",
	"soul",
] as const;

export type Genre = (typeof GENRES)[number];
