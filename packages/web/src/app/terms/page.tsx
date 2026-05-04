import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Terms of Service",
	description: "Herzies terms of service, data collection, and account deletion.",
};

export default function TermsPage() {
	const panel = {
		background: "var(--bg-panel)",
		border: "1px solid var(--border)",
		borderRadius: 6,
		padding: "1rem",
	} as const;

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
				<h1 style={{ fontSize: 18, color: "var(--purple)", marginBottom: 4 }}>
					terms of service
				</h1>
				<p style={{ fontSize: 12, color: "var(--text-dim)" }}>
					// the fine print
				</p>
			</section>

			<section>
				<h2 style={{ fontSize: 16, color: "var(--cyan)", marginBottom: 4 }}>
					data &amp; privacy
				</h2>
				<p style={{ fontSize: 12, color: "var(--text-dim)" }}>
					// what we collect
				</p>
			</section>

			<div style={{ ...panel, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
				<p style={{ fontSize: 13 }}>
					Herzies collects only what it needs to work. When you register and sync,
					the following is stored:
				</p>
				<ul style={{ fontSize: 13, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
					<li>Your email address (for authentication)</li>
					<li>Your herzie's name, level, stage, XP, and appearance</li>
					<li>Total minutes listened and a breakdown by genre</li>
					<li>Your friend code and friend list</li>
				</ul>
				<p style={{ fontSize: 13 }}>
					We do <span style={{ fontWeight: 700 }}>not</span> store what songs or artists you listen to.
					We do <span style={{ fontWeight: 700 }}>not</span> sell or share your data with anyone.
					All data is stored in Supabase with row-level security enabled.
				</p>
				<p style={{ fontSize: 13 }}>
					If you don't register, everything stays local on your machine
					in <code style={{ fontSize: 12, color: "var(--text-dim)" }}>~/.config/herzies/</code> and
					nothing is sent anywhere.
				</p>
			</div>

			<section>
				<h2 style={{ fontSize: 16, color: "var(--red)", marginBottom: 4 }}>
					delete your data
				</h2>
				<p style={{ fontSize: 12, color: "var(--text-dim)" }}>
					// the nuclear option
				</p>
			</section>

			<div style={{ ...panel, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
				<p style={{ fontSize: 13 }}>
					You can permanently delete your herzie and all associated data from our servers.
					This removes your account, herzie stats, friend connections, and leaderboard entry.
					This action is irreversible.
				</p>
				<p style={{ fontSize: 13 }}>
					To delete your herzie, log in through the CLI and
					run <code style={{ fontSize: 12, color: "var(--text-dim)" }}>herzies kill</code>.
					Your local data will be removed as well.
				</p>
			</div>

			<section>
				<h2 style={{ fontSize: 16, color: "var(--text)", marginBottom: 4 }}>
					usage
				</h2>
				<p style={{ fontSize: 12, color: "var(--text-dim)" }}>
					// the basics
				</p>
			</section>

			<div style={{ ...panel, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
				<p style={{ fontSize: 13 }}>
					Herzies is provided as-is. We reserve the right to remove accounts that
					abuse the service. By signing in, you agree to these terms.
				</p>
			</div>
		</main>
	);
}
