"use client";

import {
	type Cell,
	generateDanceFrames,
	generateIdleFrames,
	SH,
	SW,
} from "@herzies/shared";
import { useEffect, useMemo, useRef, useState } from "react";

const FONT_FAMILY = "'SF Mono', 'Menlo', monospace";

interface Props {
	/** Seed for procedural generation. */
	userId: string;
	stage?: number;
	/** Font size in px for each character cell. Default 5. */
	size?: number;
	/** When true, switches to dance animation. */
	isPlaying?: boolean;
	/** Active wearable IDs to render on the creature (e.g. ["headphones"]). */
	wearables?: string[];
	/** Accessible label. */
	ariaLabel?: string;
}

export function Herzie3D({
	userId,
	stage = 1,
	size = 5,
	isPlaying = false,
	wearables,
	ariaLabel,
}: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [frame, setFrame] = useState(0);
	const [dancing, setDancing] = useState(false);

	const wantsDancing = isPlaying;

	// Switch animation mode at a cycle boundary to avoid jumps.
	useEffect(() => {
		if (frame === 0 && dancing !== wantsDancing) {
			setDancing(wantsDancing);
		}
	}, [frame, dancing, wantsDancing]);

	const frames = useMemo(() => {
		return dancing
			? generateDanceFrames(userId, stage, wearables)
			: generateIdleFrames(userId, stage, wearables);
	}, [userId, stage, dancing, wearables]);

	const interval = dancing ? 65 : 50;

	const metrics = useMemo(() => {
		const charW = size * 0.6;
		const lineH = size * 1.35;
		return {
			charW,
			lineH,
			canvasW: Math.ceil(SW * charW),
			canvasH: Math.ceil(SH * lineH),
		};
	}, [size]);

	// Animation tick
	useEffect(() => {
		if (frames.length <= 1) return;
		const id = setInterval(
			() => setFrame((f) => (f + 1) % frames.length),
			interval,
		);
		return () => clearInterval(id);
	}, [frames.length, interval]);

	// Reset frame when source changes
	useEffect(() => {
		setFrame(0);
	}, [frames]);

	// Render
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const current = frames[frame] ?? frames[0];
		if (!current) return;

		const cells: Cell[][] = current.cells;
		ctx.clearRect(0, 0, metrics.canvasW, metrics.canvasH);
		ctx.font = `${size}px ${FONT_FAMILY}`;
		ctx.textBaseline = "top";

		for (let y = 0; y < cells.length; y++) {
			const row = cells[y];
			const py = y * metrics.lineH;
			for (let x = 0; x < row.length; x++) {
				const cell = row[x];
				if (cell.ch === " ") continue;
				ctx.fillStyle = cell.color;
				ctx.fillText(cell.ch, x * metrics.charW, py);
			}
		}
	}, [frame, frames, metrics, size]);

	return (
		<canvas
			ref={canvasRef}
			width={metrics.canvasW}
			height={metrics.canvasH}
			className="select-none [image-rendering:pixelated]"
			style={{
				width: metrics.canvasW,
				height: metrics.canvasH,
			}}
			aria-label={ariaLabel ?? `A stage ${stage} herzie`}
		/>
	);
}
