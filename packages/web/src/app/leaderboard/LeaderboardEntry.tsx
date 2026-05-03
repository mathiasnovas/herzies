"use client";

import { HerzieArt } from "../HerzieArt";

const STAGE_LABELS: Record<number, string> = {
	1: "baby",
	2: "teen",
	3: "champion",
};

const STAGE_COLORS: Record<number, string> = {
	1: "var(--yellow)",
	2: "var(--cyan)",
	3: "var(--purple)",
};

interface LeaderboardEntryProps {
	rank: number;
	name: string;
	level: number;
	stage: number;
	appearance: {
		headIndex: number;
		eyesIndex: number;
		mouthIndex: number;
		accessoryIndex: number;
		colorScheme: string;
	};
	totalMinutes: number;
	topGenres: string[];
}

function formatMinutes(mins: number): string {
	if (mins < 60) return `${mins}m`;
	const h = Math.floor(mins / 60);
	const m = mins % 60;
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function LeaderboardEntry({
	rank,
	name,
	level,
	stage,
	appearance,
	totalMinutes,
	topGenres,
}: LeaderboardEntryProps) {
	const rankColors = ["var(--yellow)", "var(--text)", "var(--text)"];
	const rankColor = rank <= 3 ? rankColors[rank - 1] : "var(--text-dim)";

	return (
		<div
			style={{
				background: "var(--bg-panel)",
				border: rank === 1 ? "1px solid var(--yellow)" : "1px solid var(--border)",
				borderRadius: 6,
				padding: "0.75rem 1rem",
				display: "flex",
				alignItems: "center",
				gap: "1rem",
			}}
		>
			{/* Rank */}
			<span
				style={{
					fontSize: 18,
					fontWeight: 700,
					color: rankColor,
					minWidth: 28,
					textAlign: "center",
					flexShrink: 0,
				}}
			>
				{rank}
			</span>

			{/* Herzie art */}
			<div className="leaderboard-herzie" style={{ flexShrink: 0 }}>
				<HerzieArt appearance={appearance} size={8} animate={false} />
			</div>

			{/* Info */}
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						display: "flex",
						alignItems: "baseline",
						gap: "0.5rem",
						flexWrap: "wrap",
					}}
				>
					<span style={{ fontSize: 14, fontWeight: 700 }}>{name}</span>
					<span style={{ fontSize: 11, color: "var(--text-dim)" }}>
						lv.{level}
					</span>
					<span style={{ fontSize: 11, color: STAGE_COLORS[stage] }}>
						{STAGE_LABELS[stage] ?? `stage ${stage}`}
					</span>
				</div>

				<div
					style={{
						fontSize: 12,
						color: "var(--text-dim)",
						marginTop: 2,
					}}
				>
					<span style={{ color: "var(--green)" }}>
						{formatMinutes(totalMinutes)}
					</span>
					{topGenres.length > 0 && (
						<span style={{ marginLeft: 8 }}>
							{topGenres.join(" / ")}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
