import type { Metadata } from "next";
import { Leaderboard } from "./Leaderboard";

export const metadata: Metadata = {
	title: "Leaderboard",
	description: "Top herzies ranked by XP. See who's listened the most and evolved the furthest.",
};

export default function LeaderboardPage() {
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

			<Leaderboard />
		</main>
	);
}
