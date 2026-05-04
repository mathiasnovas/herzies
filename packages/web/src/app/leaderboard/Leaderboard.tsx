"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { LeaderboardEntry } from "./LeaderboardEntry";

const POLL_INTERVAL = 10_000;

interface HerzieRow {
	name: string;
	stage: number;
	level: number;
	appearance: {
		headIndex: number;
		eyesIndex: number;
		mouthIndex: number;
		accessoryIndex: number;
		limbsIndex?: number;
		bodyIndex?: number;
		legsIndex?: number;
		colorScheme: string;
	};
	total_minutes_listened: number;
	genre_minutes: Record<string, number>;
	now_playing: { title: string; artist: string } | null;
}

function getTopGenres(genreMinutes: Record<string, number>, count = 3): string[] {
	return Object.entries(genreMinutes)
		.sort(([, a], [, b]) => b - a)
		.slice(0, count)
		.filter(([, mins]) => mins > 0)
		.map(([genre]) => genre);
}

export function Leaderboard() {
	const [rows, setRows] = useState<HerzieRow[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchLeaderboard = useCallback(async () => {
		const supabase = createSupabaseClient();
		const { data } = await supabase
			.from("herzies")
			.select("name, stage, level, xp, appearance, total_minutes_listened, genre_minutes, now_playing")
			.order("xp", { ascending: false })
			.limit(10);
		setRows((data ?? []) as HerzieRow[]);
		setLoading(false);
	}, []);

	useEffect(() => {
		fetchLeaderboard();
		const interval = setInterval(fetchLeaderboard, POLL_INTERVAL);
		return () => clearInterval(interval);
	}, [fetchLeaderboard]);

	if (loading) {
		return (
			<div
				style={{
					background: "var(--bg-panel)",
					border: "1px solid var(--border)",
					borderRadius: 6,
					padding: "2rem",
					textAlign: "center",
					color: "var(--text-dim)",
					fontSize: 13,
				}}
			>
				loading...
			</div>
		);
	}

	if (rows.length === 0) {
		return (
			<div
				style={{
					background: "var(--bg-panel)",
					border: "1px solid var(--border)",
					borderRadius: 6,
					padding: "2rem",
					textAlign: "center",
					color: "var(--text-dim)",
					fontSize: 13,
				}}
			>
				no herzies found yet. be the first!
			</div>
		);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
			{rows.map((herzie, i) => (
				<LeaderboardEntry
					key={herzie.name}
					rank={i + 1}
					name={herzie.name}
					level={herzie.level}
					stage={herzie.stage}
					appearance={herzie.appearance}
					totalMinutes={Math.floor(herzie.total_minutes_listened)}
					topGenres={getTopGenres(herzie.genre_minutes)}
					nowPlaying={herzie.now_playing}
				/>
			))}
		</div>
	);
}
