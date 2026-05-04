"use client";

import { HerzieArt } from "./HerzieArt";

const SAMPLE_APPEARANCE = {
	headIndex: 1,
	eyesIndex: 0,
	mouthIndex: 1,
	accessoryIndex: 0,
	colorScheme: "purple",
};

function XpBar({ progress, width = 20 }: { progress: number; width?: number }) {
	const filled = Math.round(progress * width);
	const empty = width - filled;
	const bar = "█".repeat(filled) + "░".repeat(empty);
	return (
		<span>
			<span style={{ color: "var(--green)" }}>[{bar}]</span>{" "}
			<span style={{ color: "var(--yellow)" }}>{Math.round(progress * 100)}%</span>
		</span>
	);
}

export function CliPreview() {
	return (
		<div
			style={{
				background: "var(--bg-panel)",
				border: "1px solid var(--border)",
				borderRadius: 8,
				overflow: "hidden",
			}}
		>
			{/* Title bar */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 6,
					padding: "8px 12px",
					borderBottom: "1px solid var(--border)",
					fontSize: 12,
				}}
			>
				<span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
				<span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
				<span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
				<span style={{ color: "var(--text-dim)", marginLeft: 8 }}>herzies</span>
			</div>

			{/* Terminal content */}
			<div style={{ padding: "12px 16px", fontSize: 13, lineHeight: 1.6 }}>
				{/* Header */}
				<div>
					<span style={{ color: "var(--purple)", fontWeight: 700 }}>♫ herzies</span>
					<span style={{ color: "var(--text-dim)" }}> — listening</span>
				</div>

				{/* Main: art + stats */}
				<div style={{ display: "flex", flexDirection: "row", marginTop: 8, gap: 8 }}>
					<div className="leaderboard-herzie" style={{ flexShrink: 0 }}>
						<HerzieArt appearance={SAMPLE_APPEARANCE} stage={1} size={13} />
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: 4 }}>
						<div>
							<span style={{ color: "var(--cyan)", fontWeight: 700 }}>Mochi</span>
							<span style={{ color: "var(--text-dim)" }}> — Baby (Stage 1)</span>
						</div>

						<div style={{ marginTop: 4 }}>
							<span style={{ fontWeight: 700 }}>Level:</span>{" "}
							<span style={{ color: "var(--yellow)" }}>7</span>
						</div>
						<div>
							<span style={{ fontWeight: 700 }}>XP: </span>
							<XpBar progress={0.65} />
							<span style={{ color: "var(--text-dim)" }}> (87 to next)</span>
						</div>

						<div style={{ marginTop: 4 }}>
							<span style={{ fontWeight: 700 }}>Music: </span>
							<span style={{ color: "var(--purple)" }}>12.4h (744 min)</span>
						</div>
						<div>
							<span style={{ fontWeight: 700 }}>Code: </span>
							<span style={{ color: "var(--cyan)" }}>MCHI-7X2</span>
							<span style={{ color: "var(--text-dim)" }}> (3 friendzies, +6% XP)</span>
						</div>
					</div>
				</div>

				{/* Now playing */}
				<div style={{ marginTop: 8 }}>
					<span style={{ color: "var(--green)", fontWeight: 700 }}>♪ </span>
					<span style={{ fontWeight: 700 }}>Midnight City</span>
					<span style={{ color: "var(--text-dim)" }}> — M83</span>
					<span style={{ color: "var(--text-dim)" }}> | +42 XP this session</span>
				</div>
			</div>
		</div>
	);
}
