import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Herzies",
	description: "A CLI pet that grows by listening to music",
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
						<a href="/about" style={{ fontSize: 13, color: "var(--text-dim)" }}>
							about
						</a>
					</div>
				</nav>
				{children}
			</body>
		</html>
	);
}
