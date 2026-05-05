import type { Metadata } from "next";
import { CopyBlock } from "./CopyBlock";

export const metadata: Metadata = {
	title: "Docs",
	description: "Commands and usage for the herzies CLI.",
};

const commands = [
	{
		name: "herzies",
		description: "Launch the live dashboard — your herzie dances while you listen to music and earns XP in real time.",
	},
	{
		name: "herzies hatch",
		description: "Hatch a new herzie with a random appearance. This is the first thing you run.",
	},
	{
		name: "herzies status",
		description: "Quick snapshot of your herzie — level, stage, XP, top genres, and friend code.",
	},
	{
		name: "herzies listen",
		description: "Start listening in the foreground — your herzie earns XP while the command is running.",
	},
	{
		name: "herzies login",
		description: "Log in to sync your herzie across devices.",
	},
	{
		name: "herzies friends",
		description: "List your friendzies.",
	},
	{
		name: "herzies friends add <code>",
		description: "Add a friendzie by their code. Friends give bonus XP.",
	},
	{
		name: "herzies friends remove <code>",
		description: "Remove a friendzie.",
	},
	{
		name: "herzies start",
		description: "Start background listening — your herzie earns XP without keeping a terminal open.",
	},
	{
		name: "herzies stop",
		description: "Stop background listening.",
	},
	{
		name: "herzies autostart on|off",
		description: "Auto-start the background daemon when you log in to your Mac.",
	},
	{
		name: "herzies kill",
		description: "Permanently delete your herzie and all local data.",
	},
];

export default function DocsPage() {
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
					docs
				</h1>
				<p style={{ fontSize: 12, color: "var(--text-dim)" }}>
					// commands and usage
				</p>
			</section>

			<section>
				<h2 style={{ fontSize: 14, color: "var(--cyan)", marginBottom: 8 }}>
					get started
				</h2>
				<CopyBlock command="npm i -g herzies" />
			</section>

			<section>
				<h2 style={{ fontSize: 14, color: "var(--cyan)", marginBottom: 8 }}>
					commands
				</h2>
				<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
					{commands.map((cmd) => (
						<div key={cmd.name} style={panel}>
							<code style={{ fontSize: 13, color: "var(--green)" }}>
								{cmd.name}
							</code>
							<p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
								{cmd.description}
							</p>
						</div>
					))}
				</div>
			</section>

			<section>
				<h2 style={{ fontSize: 14, color: "var(--cyan)", marginBottom: 8 }}>
					requirements
				</h2>
				<div style={panel}>
					<p style={{ fontSize: 13 }}>
						macOS with Apple Music or Spotify. Linux and Windows support is coming.
					</p>
				</div>
			</section>
		</main>
	);
}
