"use client";

import { useEffect, useState } from "react";

// Stage 1 herzie parts (matching packages/cli/src/art/parts/stage1/)
const HEADS = [
	[
		"  ╭─────╮  ",
		"  │     │  ",
		"  │ EYE │  ",
		"  │ MTH │  ",
		"  ╰─────╯  ",
	],
	[
		"  ╭──∧──╮  ",
		"  │     │  ",
		"  │ EYE │  ",
		"  │ MTH │  ",
		"  ╰─────╯  ",
	],
	[
		"  ╭─╮─╭─╮  ",
		"  ╰─┤ ├─╯  ",
		"    │EYE│   ",
		"    │MTH│   ",
		"    ╰───╯   ",
	],
	[
		"  ╭─────╮  ",
		"  │     │  ",
		"  │ EYE │  ",
		"  │ MTH │  ",
		"  ╰──○──╯  ",
	],
];

const EYES = ["◕ ◕", "● ●", "◉ ◉", "◕ ●", "★ ★", "◠ ◠"];
const MOUTHS = [" ▽ ", " ◡ ", " ω ", " ▿ ", " ∪ "];
const ACCESSORIES = ["     ♪     ", "    ✿      ", "     ⋆     ", "    ◇      ", "     ~     ", "           "];

const COLORS: Record<string, string> = {
	pink: "#ff79c6",
	blue: "#7ec8e3",
	green: "#4ade80",
	purple: "#c77dff",
	orange: "#FF8C00",
	yellow: "#facc15",
	cyan: "#22d3ee",
	red: "#ff6b6b",
};

function composeHerzie(headIdx: number, eyeIdx: number, mouthIdx: number, accIdx: number): string[] {
	const acc = ACCESSORIES[accIdx % ACCESSORIES.length];
	const head = HEADS[headIdx % HEADS.length];
	const eye = EYES[eyeIdx % EYES.length];
	const mouth = MOUTHS[mouthIdx % MOUTHS.length];

	const face = head.map((line) => line.replace("EYE", eye).replace("MTH", mouth));
	return [acc, ...face];
}

export function HerzieArt() {
	const [tick, setTick] = useState(0);
	const [herzie, setHerzie] = useState<{
		head: number;
		eyes: number;
		mouth: number;
		acc: number;
		color: string;
	} | null>(null);

	// Pick random appearance on mount
	useEffect(() => {
		const colorKeys = Object.keys(COLORS);
		setHerzie({
			head: Math.floor(Math.random() * HEADS.length),
			eyes: Math.floor(Math.random() * EYES.length),
			mouth: Math.floor(Math.random() * MOUTHS.length),
			acc: Math.floor(Math.random() * ACCESSORIES.length),
			color: colorKeys[Math.floor(Math.random() * colorKeys.length)],
		});
	}, []);

	// Float animation tick
	useEffect(() => {
		const id = setInterval(() => setTick((t) => t + 1), 600);
		return () => clearInterval(id);
	}, []);

	if (!herzie) return null;

	const lines = composeHerzie(herzie.head, herzie.eyes, herzie.mouth, herzie.acc);
	const color = COLORS[herzie.color];
	const bounceOffset = tick % 2 === 0 ? 0 : -4;

	return (
		<pre
			style={{
				color,
				fontSize: 16,
				lineHeight: 1.3,
				margin: 0,
				transform: `translateY(${bounceOffset}px)`,
				transition: "transform 0.3s ease-in-out",
				filter: `drop-shadow(0 0 12px ${color}40)`,
				userSelect: "none",
			}}
			aria-label="A stage 1 herzie"
		>
			{lines.join("\n")}
		</pre>
	);
}
