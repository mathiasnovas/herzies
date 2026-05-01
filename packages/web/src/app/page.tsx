import { HerzieArt } from "./HerzieArt";

const BANNER = `\
 _                   _
| |                 (_)
| |__   ___ _ __ _____  ___  ___
| '_ \\ / _ \\ '__|_  / |/ _ \\/ __|
| | | |  __/ |   / /| |  __/\\__ \\
|_| |_|\\___|_|  /___|_|\\___||___/`;

export default function Home() {
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
			{/* Sign in */}
			<nav style={{ display: "flex", justifyContent: "flex-end" }}>
				<a href="/auth/cli" style={{ fontSize: 13, color: "var(--text-dim)" }}>
					sign in
				</a>
			</nav>

			{/* Hero */}
			<section className="hero">
				<pre
					className="banner"
					style={{
						color: "var(--purple)",
						lineHeight: 1.25,
						margin: "0 auto 1rem",
						whiteSpace: "pre",
						display: "table",
					}}
				>
					{BANNER}
				</pre>

				<p style={{ textAlign: "center", fontSize: 13, color: "var(--text-dim)" }}>
					A CLI pet that grows by listening to music.
				</p>
			</section>

			{/* Info boxes */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
				}}
			>
				<div
					style={{
						background: "var(--bg-panel)",
						border: "1px solid var(--border)",
						borderRadius: 6,
						padding: "1rem",
					}}
				>
					<p style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 4 }}>
						// how it works
					</p>
					<p style={{ fontSize: 13 }}>
						Hatch your herzie, listen to music, watch it grow.
						Each genre shapes its personality. Friends give bonus XP.
					</p>
				</div>
				<div
					style={{
						background: "var(--bg-panel)",
						border: "1px solid var(--border)",
						borderRadius: 6,
						padding: "1rem",
					}}
				>
					<p style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 4 }}>
						// evolution
					</p>
					<p style={{ fontSize: 13, marginBottom: "1rem" }}>
						<span style={{ color: "var(--yellow)" }}>Stage 1</span> — a tiny blob
						<br />
						<span style={{ color: "var(--cyan)" }}>Stage 2</span> — limbs sprout
						<br />
						<span style={{ color: "var(--purple)" }}>Stage 3</span> — full form
					</p>
					<div
						style={{
							display: "flex",
							justifyContent: "center",
							padding: "1rem 0",
						}}
					>
						<HerzieArt />
					</div>
				</div>
			</div>

			{/* Install */}
			<div
				style={{
					background: "var(--bg-panel)",
					border: "1px solid var(--border)",
					borderRadius: 6,
					padding: "1rem 1.25rem",
				}}
			>
				<p style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 8 }}>
					// get started
				</p>
				<div style={{ fontSize: 13 }}>
					<p>
						<span style={{ color: "var(--green)" }}>$</span> npm i -g herzies
					</p>
					<p>
						<span style={{ color: "var(--green)" }}>$</span> herzies hatch
					</p>
					<p>
						<span style={{ color: "var(--green)" }}>$</span> herzies register
					</p>
				</div>
			</div>

		</main>
	);
}
