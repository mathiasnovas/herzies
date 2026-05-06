"use client";

import { useState } from "react";

const panel = {
	background: "var(--bg-panel)",
	border: "1px solid var(--border)",
	borderRadius: 6,
	padding: "1.25rem",
} as const;

export function SpotifyCard({
	connection,
}: {
	connection: { display_name: string | null; spotify_user_id: string } | null;
}) {
	const [disconnecting, setDisconnecting] = useState(false);

	return (
		<div style={panel}>
			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="#1DB954">
					<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
				</svg>
				<h2 style={{ fontSize: 14, fontWeight: 700 }}>spotify</h2>
			</div>

			{connection ? (
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<div>
						<p style={{ fontSize: 13 }}>
							connected as{" "}
							<span style={{ color: "var(--green)", fontWeight: 700 }}>
								{connection.display_name ?? connection.spotify_user_id}
							</span>
						</p>
						<p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
							your herzie earns XP automatically while you listen
						</p>
					</div>
					<form
						action="/api/spotify/disconnect"
						method="POST"
						onSubmit={() => setDisconnecting(true)}
					>
						<button
							type="submit"
							disabled={disconnecting}
							style={{
								padding: "0.35rem 0.75rem",
								background: "none",
								border: "1px solid var(--border)",
								borderRadius: 4,
								color: "var(--text-dim)",
								fontFamily: "inherit",
								fontSize: 12,
								cursor: disconnecting ? "default" : "pointer",
								opacity: disconnecting ? 0.5 : 1,
							}}
						>
							{disconnecting ? "..." : "disconnect"}
						</button>
					</form>
				</div>
			) : (
				<div>
					<p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: "0.75rem" }}>
						connect your Spotify account so your herzie earns XP automatically,
						even when you're not running the CLI.
					</p>
					<a
						href="/api/spotify/connect"
						style={{
							display: "inline-block",
							padding: "0.5rem 1rem",
							background: "#1DB954",
							color: "#000",
							borderRadius: 4,
							fontWeight: 700,
							fontSize: 13,
							textDecoration: "none",
						}}
					>
						connect Spotify
					</a>
				</div>
			)}
		</div>
	);
}
