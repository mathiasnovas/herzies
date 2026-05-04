import chalk from "chalk";

export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export interface ItemDef {
	id: string;
	name: string;
	description: string;
	rarity: Rarity;
	art: string[];
	frames: string[][];
}

export const RARITY_COLORS: Record<Rarity, string> = {
	common: "#9d9d9d",
	uncommon: "#1eff00",
	rare: "#0070dd",
	legendary: "#ff8000",
};

export const RARITY_LABELS: Record<Rarity, string> = {
	common: "Common",
	uncommon: "Uncommon",
	rare: "Rare",
	legendary: "Legendary",
};

// --- 3D Math ---
type V3 = [number, number, number];
type V2 = [number, number];

function rotY(p: V3, a: number): V3 {
	const c = Math.cos(a), s = Math.sin(a);
	return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}

function rotZ(p: V3, a: number): V3 {
	const c = Math.cos(a), s = Math.sin(a);
	return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
}

function dot3(a: V3, b: V3): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function norm(v: V3): V3 {
	const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	return [v[0] / l, v[1] / l, v[2] / l];
}

function cross(a: V3, b: V3): V3 {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0],
	];
}

// --- Constants ---
const SW = 30; // screen width
const SH = 18; // screen height
const CHAR_ASPECT = 2.1; // terminal chars are ~2x taller than wide
const CARD_HW = 0.85; // card half-width
const CARD_HH = 1.3; // card half-height
const TILT = 12 * (Math.PI / 180);
const CAM = 4.5;
const LIGHT = norm([0.4, -0.6, -0.8]);
const RAMP = " .·:;=+*#%@█";

// Card corners: TL, TR, BR, BL
const CORNERS: V3[] = [
	[-CARD_HW, -CARD_HH, 0],
	[CARD_HW, -CARD_HH, 0],
	[CARD_HW, CARD_HH, 0],
	[-CARD_HW, CARD_HH, 0],
];
const UVS: V2[] = [
	[0, 0],
	[1, 0],
	[1, 1],
	[0, 1],
];

// --- Card textures ---
function frontTexture(u: number, v: number): number {
	const bw = 0.055;
	// Outer border
	if (u < bw || u > 1 - bw || v < bw || v > 1 - bw) return 0.9;

	// Inner border line
	const ib = 0.11;
	const ibw = 0.012;
	if (
		(u > ib - ibw && u < ib + ibw && v > ib && v < 1 - ib) ||
		(u > 1 - ib - ibw && u < 1 - ib + ibw && v > ib && v < 1 - ib) ||
		(v > ib - ibw && v < ib + ibw && u > ib && u < 1 - ib) ||
		(v > 1 - ib - ibw && v < 1 - ib + ibw && u > ib && u < 1 - ib)
	)
		return 0.65;

	// Corner diamonds (diamond shape)
	const diamonds: V2[] = [
		[0.16, 0.1],
		[0.84, 0.1],
		[0.16, 0.9],
		[0.84, 0.9],
	];
	for (const [dx, dy] of diamonds) {
		const du = Math.abs(u - dx) / 0.035;
		const dv = Math.abs(v - dy) / 0.045;
		if (du + dv < 1) return 1.0;
	}

	// Large "1" in center — built from rectangles
	const cx = 0.5,
		cy = 0.5;
	const blocks: [number, number, number, number][] = [
		// Vertical stem
		[cx - 0.03, cy - 0.16, cx + 0.03, cy + 0.13],
		// Top serif / flag
		[cx - 0.08, cy - 0.13, cx - 0.02, cy - 0.09],
		[cx - 0.055, cy - 0.16, cx - 0.02, cy - 0.13],
		// Base
		[cx - 0.09, cy + 0.13, cx + 0.09, cy + 0.17],
	];
	for (const [x1, y1, x2, y2] of blocks) {
		if (u >= x1 && u <= x2 && v >= y1 && v <= y2) return 0.95;
	}

	// Card face background
	return 0.3;
}

function backTexture(u: number, v: number): number {
	const bw = 0.055;
	if (u < bw || u > 1 - bw || v < bw || v > 1 - bw) return 0.7;

	// Crosshatch pattern
	const g = 0.065;
	const w = 0.018;
	const onU = (u % g) < w;
	const onV = (v % g) < w;
	if (onU || onV) return 0.5;
	return 0.28;
}

// --- Projection ---
function project(p: V3): V2 {
	const z = p[2] + CAM;
	const s = CAM / z;
	return [SW / 2 + p[0] * s * SW * 0.22 * CHAR_ASPECT, SH / 2 + p[1] * s * SH * 0.28];
}

// --- Barycentric UV interpolation in a triangle ---
function triUV(
	px: number,
	py: number,
	ax: number,
	ay: number,
	au: number,
	av: number,
	bx: number,
	by: number,
	bu: number,
	bv: number,
	cx: number,
	cy: number,
	cu: number,
	cv: number,
): V2 | null {
	const v0x = cx - ax,
		v0y = cy - ay;
	const v1x = bx - ax,
		v1y = by - ay;
	const v2x = px - ax,
		v2y = py - ay;

	const d00 = v0x * v0x + v0y * v0y;
	const d01 = v0x * v1x + v0y * v1y;
	const d02 = v0x * v2x + v0y * v2y;
	const d11 = v1x * v1x + v1y * v1y;
	const d12 = v1x * v2x + v1y * v2y;

	const den = d00 * d11 - d01 * d01;
	if (Math.abs(den) < 1e-10) return null;

	const inv = 1 / den;
	const s = (d11 * d02 - d01 * d12) * inv;
	const t = (d00 * d12 - d01 * d02) * inv;

	if (s < -0.001 || t < -0.001 || s + t > 1.001) return null;
	const w = 1 - s - t;
	return [w * au + t * bu + s * cu, w * av + t * bv + s * cv];
}

// --- Render a single frame ---
function renderFrame(yAngle: number): string[] {
	// Transform corners
	const xf = CORNERS.map((v) => rotY(rotZ(v, TILT), yAngle));

	// Face normal
	const e1: V3 = [xf[1][0] - xf[0][0], xf[1][1] - xf[0][1], xf[1][2] - xf[0][2]];
	const e2: V3 = [xf[3][0] - xf[0][0], xf[3][1] - xf[0][1], xf[3][2] - xf[0][2]];
	const faceN = norm(cross(e1, e2));
	const front = faceN[2] < 0;
	const diffuse = Math.abs(dot3(faceN, LIGHT));

	// Project
	const pr = xf.map((v) => project(v));

	// Rasterize
	const bright: number[][] = Array.from({ length: SH }, () => Array(SW).fill(-1));
	const isContent: boolean[][] = Array.from({ length: SH }, () =>
		Array(SW).fill(false),
	);

	for (let sy = 0; sy < SH; sy++) {
		for (let sx = 0; sx < SW; sx++) {
			const px = sx + 0.5,
				py = sy + 0.5;

			// Try two triangles: 0-1-2 and 0-2-3
			let uv =
				triUV(
					px, py,
					pr[0][0], pr[0][1], UVS[0][0], UVS[0][1],
					pr[1][0], pr[1][1], UVS[1][0], UVS[1][1],
					pr[2][0], pr[2][1], UVS[2][0], UVS[2][1],
				) ??
				triUV(
					px, py,
					pr[0][0], pr[0][1], UVS[0][0], UVS[0][1],
					pr[2][0], pr[2][1], UVS[2][0], UVS[2][1],
					pr[3][0], pr[3][1], UVS[3][0], UVS[3][1],
				);

			if (!uv) continue;

			let [u, v] = uv;
			if (!front) u = 1 - u; // mirror for back face

			const tex = front ? frontTexture(u, v) : backTexture(u, v);
			const lit = tex * (0.2 + 0.8 * diffuse);
			bright[sy][sx] = lit;
			isContent[sy][sx] = front && tex > 0.5;
		}
	}

	// Map to colored characters
	const g = chalk.hex("#FFD700");
	const d = chalk.hex("#8B6914");
	const b = chalk.hex("#654A0E");

	return bright.map((row, y) =>
		row
			.map((val, x) => {
				if (val < 0) return " ";
				const idx = Math.min(
					Math.floor(val * (RAMP.length - 1)),
					RAMP.length - 1,
				);
				const ch = RAMP[idx];
				if (ch === " ") return " ";
				return isContent[y][x] ? g(ch) : front ? d(ch) : b(ch);
			})
			.join(""),
	);
}

// --- Generate all frames ---
function generateFrames(): string[][] {
	const frames: string[][] = [];
	const spinCount = 36;

	for (let i = 0; i < spinCount; i++) {
		frames.push(renderFrame((i / spinCount) * Math.PI * 2));
	}

	return frames;
}

const firstEditionFrames = generateFrames();

export const ITEMS: ItemDef[] = [
	{
		id: "first-edition",
		name: "First Edition Card",
		description: "A token of appreciation for early adopters.",
		rarity: "rare",
		art: firstEditionFrames[0],
		frames: firstEditionFrames,
	},
];

export function getItem(id: string): ItemDef | undefined {
	return ITEMS.find((item) => item.id === id);
}
