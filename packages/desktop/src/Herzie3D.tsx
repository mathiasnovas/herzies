import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	generateIdleFrames,
	generateRotationFrames,
	generateDanceFrames,
	renderCreatureAtAngle,
	DEFAULT_Y_ANGLE,
	SW,
	SH,
} from "./creature-renderer";
import type { Cell } from "./creature-renderer";
import { renderSky, renderGround } from "./scenery-renderer";

const FONT_FAMILY = "'SF Mono', 'Menlo', monospace";
const DRAG_SENSITIVITY = Math.PI / 200; // ~180° per 200px
const FRICTION = 0.92; // velocity multiplier per frame — controls how quickly momentum dies
const MIN_VELOCITY = 0.0005; // stop the loop when velocity is imperceptible

interface Props {
	userId: string;
	stage?: number;
	/** Font size in px for each character cell. */
	size?: number;
	/** Enable continuous Y-axis rotation. Default: false (idle breathing only). */
	animate?: boolean;
	/** Music is playing — switches to dance animation. No effect when animate is false. */
	isPlaying?: boolean;
	/** Active wearable IDs to render on the creature (e.g. ["headphones"]). */
	wearables?: string[];
}

function useIsNight(): boolean {
	const [isNight, setIsNight] = useState(() => {
		const h = new Date().getHours();
		return h >= 21 || h < 6;
	});

	useEffect(() => {
		const check = () => {
			const h = new Date().getHours();
			setIsNight(h >= 21 || h < 6);
		};
		const id = setInterval(check, 10 * 60 * 1000); // re-check every 10 minutes
		return () => clearInterval(id);
	}, []);

	return isNight;
}

export function Herzie3D({ userId, stage = 1, size = 5, animate, isPlaying = false, wearables }: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const skyRef = useRef<HTMLPreElement>(null);
	const groundRef = useRef<HTMLPreElement>(null);
	const [frame, setFrame] = useState(0);
	const [dragAngle, setDragAngle] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [dancing, setDancing] = useState(false);
	const dragging = useRef(false);
	const dragStartX = useRef(0);
	const dragStartAngle = useRef(0);
	const lastMoveX = useRef(0);
	const lastMoveTime = useRef(0);
	const velocity = useRef(0);
	const momentumRaf = useRef(0);

	// --- Scenery state ---
	const isNight = useIsNight();
	const cloudOffset = useRef(0);
	const twinkleFrame = useRef(0);

	// Dynamic column count based on window width
	const [sceneryCols, setSceneryCols] = useState(() =>
		Math.floor(window.innerWidth / (size * 0.6)),
	);

	useEffect(() => {
		const onResize = () => {
			setSceneryCols(Math.floor(window.innerWidth / (size * 0.6)));
		};
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [size]);

	const hasDragged = dragAngle !== 0;
	const wantsDancing = animate !== false && isPlaying;

	// Transition at cycle boundary — wait for frame 0 before switching
	useEffect(() => {
		if (frame === 0 && dancing !== wantsDancing) {
			setDancing(wantsDancing);
		}
	}, [frame, dancing, wantsDancing]);

	const frames = useMemo(
		() => {
			if (dancing) return generateDanceFrames(userId, stage, wearables);
			if (animate) return generateRotationFrames(userId, stage, undefined, wearables);
			return generateIdleFrames(userId, stage, wearables);
		},
		[userId, stage, animate, dancing, wearables],
	);

	const interval = dancing ? 65 : (animate ? 80 : 50);

	// Measure character cell dimensions once
	const metrics = useMemo(() => {
		const charW = size * 0.6; // monospace char width ≈ 0.6 × font-size
		const lineH = size * 1.35;
		return {
			charW,
			lineH,
			canvasW: Math.ceil(SW * charW),
			canvasH: Math.ceil(SH * lineH),
		};
	}, [size]);

	const drawFrame = useCallback(
		(cells: Cell[][]) => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

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
		},
		[size, metrics],
	);

	// --- Momentum decay loop ---

	const startMomentum = useCallback(() => {
		cancelAnimationFrame(momentumRaf.current);

		const tick = () => {
			velocity.current *= FRICTION;
			if (Math.abs(velocity.current) < MIN_VELOCITY) {
				velocity.current = 0;
				return;
			}
			setDragAngle((prev) => prev + velocity.current);
			momentumRaf.current = requestAnimationFrame(tick);
		};

		momentumRaf.current = requestAnimationFrame(tick);
	}, []);

	// Clean up momentum loop on unmount
	useEffect(() => () => cancelAnimationFrame(momentumRaf.current), []);

	// --- Drag handlers ---

	const onMouseDown = useCallback((e: React.MouseEvent) => {
		cancelAnimationFrame(momentumRaf.current);
		velocity.current = 0;
		dragging.current = true;
		setIsDragging(true);
		dragStartX.current = e.clientX;
		dragStartAngle.current = dragAngle;
		lastMoveX.current = e.clientX;
		lastMoveTime.current = performance.now();
	}, [dragAngle]);

	const onMouseMove = useCallback((e: React.MouseEvent) => {
		if (!dragging.current) return;
		const now = performance.now();
		const dt = now - lastMoveTime.current;
		if (dt > 0) {
			velocity.current = -(e.clientX - lastMoveX.current) * DRAG_SENSITIVITY;
		}
		lastMoveX.current = e.clientX;
		lastMoveTime.current = now;

		const deltaX = e.clientX - dragStartX.current;
		setDragAngle(dragStartAngle.current - deltaX * DRAG_SENSITIVITY);
	}, []);

	const stopDrag = useCallback(() => {
		if (!dragging.current) return;
		dragging.current = false;
		setIsDragging(false);

		// If the last move was too long ago, the user paused before releasing — no momentum
		if (performance.now() - lastMoveTime.current < 50) {
			startMomentum();
		}
	}, [startMomentum]);

	// --- Animation timer ---

	useEffect(() => {
		if (frames.length <= 1) return;
		const id = setInterval(
			() => setFrame((f) => (f + 1) % frames.length),
			interval,
		);
		return () => clearInterval(id);
	}, [frames.length, interval]);

	// Reset frame on source change
	useEffect(() => {
		setFrame(0);
	}, [frames]);

	// --- Ground (static, re-renders only on userId or column change) ---

	useEffect(() => {
		const el = groundRef.current;
		if (!el) return;
		el.innerHTML = renderGround({ userId, cols: sceneryCols });
	}, [userId, sceneryCols]);

	// --- Sky animation ---

	useEffect(() => {
		if (animate === false) return;
		const el = skyRef.current;
		if (!el) return;

		const cols = sceneryCols;

		const render = () => {
			el.innerHTML = renderSky({
				userId, isNight, isPlaying,
				cloudOffset: Math.floor(cloudOffset.current),
				twinkleFrame: twinkleFrame.current,
				cols,
			});
		};

		render();

		const cloudId = setInterval(() => {
			cloudOffset.current += isPlaying ? 1.4 : 1;
			render();
		}, 100);

		const twinkleId = setInterval(() => {
			twinkleFrame.current += 1;
			render();
		}, 200);

		return () => {
			clearInterval(cloudId);
			clearInterval(twinkleId);
		};
	}, [userId, isNight, isPlaying, animate, sceneryCols]);

	// --- Render ---

	useEffect(() => {
		if (hasDragged) {
			// Real-time render at the dragged angle
			const yAngle = animate
				? (frame / frames.length) * Math.PI * 2 + dragAngle
				: DEFAULT_Y_ANGLE + dragAngle;
			const data = renderCreatureAtAngle(userId, stage, yAngle, frame, dancing, wearables);
			drawFrame(data.cells);
		} else {
			// Use pre-computed frames
			const current = frames[frame] ?? frames[0];
			if (current) drawFrame(current.cells);
		}
	}, [frame, frames, drawFrame, dragAngle, hasDragged, userId, stage, animate, dancing, wearables]);

	const sceneryPreStyle = {
		margin: 0,
		padding: 0,
		font: `${size}px ${FONT_FAMILY}`,
		lineHeight: `${metrics.lineH}px`,
		letterSpacing: 0,
		overflow: "hidden" as const,
		pointerEvents: "none" as const,
	};

	return (
		<>
			{/* Sky — fixed to window top, full width */}
			<pre
				ref={skyRef}
				style={{
					...sceneryPreStyle,
					position: "fixed",
					top: 0,
					left: 0,
					width: "100vw",
					zIndex: 0,
				}}
			/>
			{/* Creature + ground wrapper */}
			<div style={{ position: "relative" }}>
				<canvas
					ref={canvasRef}
					width={metrics.canvasW}
					height={metrics.canvasH}
					onMouseDown={onMouseDown}
					onMouseMove={onMouseMove}
					onMouseUp={stopDrag}
					onMouseLeave={stopDrag}
					style={{
						position: "relative",
						zIndex: 1,
						width: metrics.canvasW,
						height: metrics.canvasH,
						imageRendering: "pixelated",
						userSelect: "none",
						cursor: isDragging ? "grabbing" : "grab",
					}}
					aria-label={`A stage ${stage} herzie`}
				/>
				{/* Ground — anchored to canvas bottom, breaks out to full width */}
				<pre
					ref={groundRef}
					style={{
						...sceneryPreStyle,
						position: "absolute",
						bottom: metrics.lineH * 4,
						left: "50%",
						transform: "translateX(-50%)",
						width: "100vw",
						zIndex: 0,
					}}
				/>
			</div>
		</>
	);
}
