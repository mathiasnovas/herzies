import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
	title: {
		default: "Herzies — A CLI digital pet that grows by listening to music",
		template: "%s | Herzies",
	},
	description:
		"Hatch your herzie, play music, and watch it evolve. A terminal-based digital pet powered by your listening habits. Works with Apple Music and Spotify on macOS.",
	keywords: ["cli", "digital pet", "music", "terminal", "macos", "apple music", "spotify"],
	openGraph: {
		title: "Herzies",
		description: "A CLI digital pet that grows by listening to music.",
		siteName: "Herzies",
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "Herzies",
		description: "A CLI digital pet that grows by listening to music.",
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>
				<nav
					style={{
						maxWidth: 800,
						margin: "0 auto",
						padding: "1.5rem 1.5rem 0",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<a
						href="/"
						style={{
							fontSize: 16,
							fontWeight: 700,
							color: "var(--purple)",
							textDecoration: "none",
						}}
					>
						herzies
					</a>
					<div style={{ display: "flex", gap: "1rem" }}>
						<a href="/leaderboard" style={{ fontSize: 13, color: "var(--yellow)" }}>
							leaderboard
						</a>
						<a href="/docs" style={{ fontSize: 13, color: "var(--cyan)" }}>
							docs
						</a>
						<a href="/about" style={{ fontSize: 13, color: "var(--text-dim)" }}>
							about
						</a>
					</div>
				</nav>
				{children}
				<Analytics />
			</body>
		</html>
	);
}
