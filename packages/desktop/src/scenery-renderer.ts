/**
 * Background scenery renderer for Herzie3D.
 *
 * Two separate zones rendered as independent HTML strings:
 * - Sky (6 rows): clouds by day, stars by night — anchored to window top
 * - Ground (3 rows): sparse grass — anchored to creature canvas bottom
 */

import { simpleHash, mulberry32 } from "./creature-renderer";

// --- Colors ---
const GRASS_COLOR = "#4a7c59";
const SKY_COLOR = "#8899aa";
const BRIGHT_STAR_COLOR = "#ccddee";

// --- Zone sizes ---
const SKY_ROWS = 9;
const GROUND_ROWS = 5; // 2 tall stalks/flowers + 3 grass

// --- Cloud config ---
const CLOUD_CHARS = [".", "-", "~", ".", "~"];

// --- Star config ---
const STAR_TWINKLE_VARIANTS = ["\u00B7", "+", "*", "\u00B7", "+"]; // · + * · +

// --- Grass config ---
const GRASS_CHARS = ["\u2227", "'", ",", "|"]; // ∧ ' , |

// --- Stalk/flower config ---
const STALK_COLOR = "#3d6b4e";
const FLOWER_COLORS = ["#c27a8a", "#d4a054", "#8a7cc2", "#c2a27a"]; // muted rose, gold, violet, tan
const STALK_CHAR = "|";
const FLOWER_CHARS = ["\u00B7", "*", "\u00B0"]; // · * °

interface Cloud {
	row: number;
	fractionalCol: number;
	chars: string[];
}

interface Star {
	row: number;
	fractionalCol: number;
	phase: number;
	bright: boolean;
	musicOnly: boolean;
}

function generateGrassRow(baseSeed: number, rowIdx: number, cols: number): string[] {
	const rng = mulberry32(baseSeed + rowIdx * 7919);
	const row: string[] = new Array(cols).fill(" ");
	let col = Math.floor(rng() * 4);
	while (col < cols) {
		const clusterLen = 1 + Math.floor(rng() * 4);
		for (let c = 0; c < clusterLen && col + c < cols; c++) {
			row[col + c] = GRASS_CHARS[Math.floor(rng() * GRASS_CHARS.length)];
		}
		col += clusterLen + 2 + Math.floor(rng() * 7);
	}
	return row;
}

function generateClouds(rng: () => number): Cloud[] {
	const count = 3 + Math.floor(rng() * 2);
	const clouds: Cloud[] = [];
	for (let i = 0; i < count; i++) {
		const row = Math.floor(rng() * SKY_ROWS);
		const fractionalCol = rng();
		const len = 4 + Math.floor(rng() * 8);
		const chars: string[] = [];
		for (let c = 0; c < len; c++) {
			if (rng() < 0.25) {
				chars.push(" ");
			} else {
				chars.push(CLOUD_CHARS[Math.floor(rng() * CLOUD_CHARS.length)]);
			}
		}
		clouds.push({ row, fractionalCol, chars });
	}
	return clouds;
}

function generateStars(rng: () => number): Star[] {
	const stars: Star[] = [];
	const count = 15 + Math.floor(rng() * 6);
	const extraCount = 4 + Math.floor(rng() * 3);
	const totalCount = count + extraCount;

	for (let i = 0; i < totalCount; i++) {
		const row = Math.floor(rng() * SKY_ROWS);
		const fractionalCol = rng();
		stars.push({
			row,
			fractionalCol,
			phase: Math.floor(rng() * 20),
			bright: rng() < 0.15,
			musicOnly: i >= count,
		});
	}
	return stars;
}

// --- Caches keyed by userId ---
let cachedUserId = "";
let cachedGrassSeed = 0;
let cachedClouds: Cloud[] = [];
let cachedStars: Star[] = [];

function ensureCache(userId: string) {
	if (cachedUserId === userId) return;
	cachedUserId = userId;

	const seed = simpleHash(userId + ":scenery");
	const rng = mulberry32(seed);

	cachedGrassSeed = simpleHash(userId + ":grass");
	cachedClouds = generateClouds(rng);
	cachedStars = generateStars(rng);
}

export function renderSky(opts: {
	userId: string;
	isNight: boolean;
	isPlaying: boolean;
	cloudOffset: number;
	twinkleFrame: number;
	cols: number;
}): string {
	const { userId, isNight, isPlaying, cloudOffset, twinkleFrame, cols } = opts;
	ensureCache(userId);

	const lines: string[] = [];

	if (isNight) {
		const skyGrid: (string | null)[][] = [];
		const colorGrid: (string | null)[][] = [];
		for (let r = 0; r < SKY_ROWS; r++) {
			skyGrid.push(new Array(cols).fill(null));
			colorGrid.push(new Array(cols).fill(null));
		}

		for (const star of cachedStars) {
			if (star.musicOnly && !isPlaying) continue;
			const col = Math.floor(star.fractionalCol * cols);
			if (col >= cols) continue;
			const tickRate = isPlaying ? 8 : 12;
			const variantIdx = Math.floor((twinkleFrame + star.phase) / tickRate) % STAR_TWINKLE_VARIANTS.length;
			skyGrid[star.row][col] = STAR_TWINKLE_VARIANTS[variantIdx];
			colorGrid[star.row][col] = star.bright ? BRIGHT_STAR_COLOR : SKY_COLOR;
		}

		for (let r = 0; r < SKY_ROWS; r++) {
			let line = "";
			for (let c = 0; c < cols; c++) {
				const ch = skyGrid[r][c];
				if (ch) {
					line += `<span style="color:${colorGrid[r][c]}">${ch}</span>`;
				} else {
					line += " ";
				}
			}
			lines.push(line);
		}
	} else {
		const skyGrid: (string | null)[][] = [];
		for (let r = 0; r < SKY_ROWS; r++) {
			skyGrid.push(new Array(cols).fill(null));
		}

		for (const cloud of cachedClouds) {
			const baseCol = Math.floor(cloud.fractionalCol * cols);
			const shifted = ((baseCol + cloudOffset) % cols + cols) % cols;
			for (let i = 0; i < cloud.chars.length; i++) {
				if (cloud.chars[i] === " ") continue;
				const col = (shifted + i) % cols;
				if (shifted + cloud.chars.length > cols && col >= shifted) continue;
				if (shifted + cloud.chars.length <= cols || col < shifted) {
					skyGrid[cloud.row][col] = cloud.chars[i];
				}
			}
		}

		for (let r = 0; r < SKY_ROWS; r++) {
			let line = "";
			for (let c = 0; c < cols; c++) {
				const ch = skyGrid[r][c];
				if (ch) {
					line += `<span style="color:${SKY_COLOR}">${ch}</span>`;
				} else {
					line += " ";
				}
			}
			lines.push(line);
		}
	}

	return lines.join("\n");
}

interface StalkCell {
	ch: string;
	color: string;
}

function generateStalks(baseSeed: number, cols: number): (StalkCell | null)[][] {
	const rng = mulberry32(baseSeed + 31337);
	const rows: (StalkCell | null)[][] = [
		new Array(cols).fill(null), // row 0: flower tops (tallest)
		new Array(cols).fill(null), // row 1: stalk middles
	];

	// Place 1 stalk per ~25-40 columns
	let col = 5 + Math.floor(rng() * 10);
	while (col < cols) {
		const tall = rng() < 0.4; // 40% chance of being 2-row tall
		const hasFlower = rng() < 0.5;
		const flowerColor = FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)];
		const flowerChar = FLOWER_CHARS[Math.floor(rng() * FLOWER_CHARS.length)];

		// Bottom of stalk always in row 1
		rows[1][col] = { ch: STALK_CHAR, color: STALK_COLOR };

		if (tall) {
			// Tall stalk: flower or tip in row 0, stalk in row 1
			rows[0][col] = hasFlower
				? { ch: flowerChar, color: flowerColor }
				: { ch: STALK_CHAR, color: STALK_COLOR };
		} else {
			// Short stalk: flower or tip in row 1, nothing in row 0
			if (hasFlower) {
				rows[1][col] = { ch: flowerChar, color: flowerColor };
			}
		}

		col += 25 + Math.floor(rng() * 16);
	}

	return rows;
}

export function renderGround(opts: {
	userId: string;
	cols: number;
}): string {
	const { userId, cols } = opts;
	ensureCache(userId);

	const stalkRows = generateStalks(cachedGrassSeed, cols);
	const lines: string[] = [];

	// Stalk rows (top 2 of ground zone)
	for (const row of stalkRows) {
		let line = "";
		let lastNonNull = -1;
		for (let c = cols - 1; c >= 0; c--) {
			if (row[c]) { lastNonNull = c; break; }
		}
		if (lastNonNull < 0) {
			lines.push("");
			continue;
		}
		for (let c = 0; c <= lastNonNull; c++) {
			const cell = row[c];
			if (cell) {
				line += `<span style="color:${cell.color}">${cell.ch}</span>`;
			} else {
				line += " ";
			}
		}
		lines.push(line);
	}

	// Grass rows (bottom 3 of ground zone)
	for (let r = 0; r < 3; r++) {
		const row = generateGrassRow(cachedGrassSeed, r, cols);
		let line = "";
		let lastNonSpace = -1;
		for (let c = cols - 1; c >= 0; c--) {
			if (row[c] !== " ") { lastNonSpace = c; break; }
		}
		if (lastNonSpace < 0) {
			lines.push("");
			continue;
		}
		for (let c = 0; c <= lastNonSpace; c++) {
			if (row[c] !== " ") {
				line += `<span style="color:${GRASS_COLOR}">${row[c]}</span>`;
			} else {
				line += " ";
			}
		}
		lines.push(line);
	}

	return lines.join("\n");
}
