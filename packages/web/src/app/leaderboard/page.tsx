import type { Metadata } from "next";
import { createSupabaseClient } from "@/lib/supabase";
import { LeaderboardEntry } from "./LeaderboardEntry";

export const metadata: Metadata = {
	title: "Leaderboard",
	description: "Top herzies ranked by XP. See who's listened the most and evolved the furthest.",
};

interface HerzieRow {
	name: string;
	stage: number;
	level: number;
	appearance: {
		headIndex: number;
		eyesIndex: number;
		mouthIndex: number;
		accessoryIndex: number;
		colorScheme: string;
	};
	total_minutes_listened: number;
	genre_minutes: Record<string, number>;
}

function getTopGenres(genreMinutes: Record<string, number>, count = 3): string[] {
	return Object.entries(genreMinutes)
		.sort(([, a], [, b]) => b - a)
		.slice(0, count)
		.filter(([, mins]) => mins > 0)
		.map(([genre]) => genre);
}

export const revalidate = 60;

export default async function LeaderboardPage() {
	const supabase = createSupabaseClient();

	const { data: herzies } = await supabase
		.from("herzies")
		.select("name, stage, level, xp, appearance, total_minutes_listened, genre_minutes")
		.order("xp", { ascending: false })
		.limit(10);

	const rows = (herzies ?? []) as HerzieRow[];

	return (
		<main
			style={{
				maxWidth: 800,
				margin: "0 auto",
				padding: "3rem 1.5rem",
				display: "flex",
				flexDirection: "column",
				gap: "1.5rem",
			}}
		>
			<section>
				<h1
					style={{
						fontSize: 18,
						color: "var(--purple)",
						marginBottom: 4,
					}}
				>
					leaderboard
				</h1>
				<p style={{ fontSize: 12, color: "var(--text-dim)" }}>
					// top herzies, ranked by xp
				</p>
			</section>

			{rows.length === 0 ? (
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
			) : (
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
						/>
					))}
				</div>
			)}
		</main>
	);
}
