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
						flexWrap: "wrap",
						justifyContent: "space-between",
						alignItems: "center",
						gap: "1rem 2rem",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
						<a
							className="gh-mobile"
							href="https://github.com/Herzies/herzies"
							target="_blank"
							rel="noopener noreferrer"
							style={{ display: "none", alignItems: "center" }}
						>
							<svg width="18" height="18" viewBox="0 0 16 16" fill="var(--text-dim)" aria-label="GitHub">
								<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
							</svg>
						</a>
					</div>
					<div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
						<a href="/leaderboard" style={{ fontSize: 13, color: "var(--yellow)" }}>
							leaderboard
						</a>
						<a href="/docs" style={{ fontSize: 13, color: "var(--cyan)" }}>
							docs
						</a>
						<a href="/about" style={{ fontSize: 13, color: "var(--text-dim)" }}>
							about
						</a>
						<a
							className="gh-desktop"
							href="https://github.com/Herzies/herzies"
							target="_blank"
							rel="noopener noreferrer"
							style={{ display: "flex", alignItems: "center" }}
						>
							<svg width="18" height="18" viewBox="0 0 16 16" fill="var(--text-dim)" aria-label="GitHub">
								<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
							</svg>
						</a>
					</div>
				</nav>
				{children}
				<footer
					style={{
						maxWidth: 800,
						margin: "0 auto",
						padding: "3rem 1.5rem 1.5rem",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						fontSize: 12,
						color: "var(--text-dim)",
					}}
				>
					<span>&copy; {new Date().getFullYear()} Herzies</span>
					<a href="/terms" style={{ fontSize: 12, color: "var(--text-dim)" }}>
						terms of service
					</a>
				</footer>
				<Analytics />
			</body>
		</html>
	);
}
