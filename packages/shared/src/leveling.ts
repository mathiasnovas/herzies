import type { Herzie, Stage } from "./types.js";

export function xpForLevel(level: number): number {
	return Math.floor(100 * Math.pow(level, 1.5));
}

export function totalXpForLevel(level: number): number {
	let total = 0;
	for (let i = 2; i <= level; i++) {
		total += xpForLevel(i);
	}
	return total;
}

export function xpToNextLevel(herzie: Herzie): number {
	const needed = xpForLevel(herzie.level + 1);
	const progressInLevel = herzie.xp - totalXpForLevel(herzie.level);
	return needed - progressInLevel;
}

export function levelProgress(herzie: Herzie): number {
	const needed = xpForLevel(herzie.level + 1);
	const progressInLevel = herzie.xp - totalXpForLevel(herzie.level);
	return Math.min(1, Math.max(0, progressInLevel / needed));
}

export function stageForLevel(level: number): Stage {
	if (level >= 25) return 3;
	if (level >= 10) return 2;
	return 1;
}

const BASE_XP_PER_MINUTE = 10;

export function calculateXpGain(
	minutes: number,
	friendCount: number,
	isCravingGenre: boolean,
): number {
	let xp = minutes * BASE_XP_PER_MINUTE;
	const friendBonus = Math.min(friendCount, 20) * 0.02;
	xp *= 1 + friendBonus;
	if (isCravingGenre) {
		xp *= 1.5;
	}
	return xp;
}

export function applyXp(
	herzie: Herzie,
	xpGain: number,
): { leveledUp: boolean; evolved: boolean; newStage?: Stage } {
	herzie.xp += xpGain;
	let leveledUp = false;
	let evolved = false;
	let newStage: Stage | undefined;
	while (herzie.xp >= totalXpForLevel(herzie.level + 1)) {
		herzie.level++;
		leveledUp = true;
		const stage = stageForLevel(herzie.level);
		if (stage !== herzie.stage) {
			herzie.stage = stage;
			evolved = true;
			newStage = stage;
		}
	}
	return { leveledUp, evolved, newStage };
}
