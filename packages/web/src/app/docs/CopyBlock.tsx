"use client";

import { useState } from "react";

export function CopyBlock({ command }: { command: string }) {
	const [copied, setCopied] = useState(false);

	const handleClick = async () => {
		await navigator.clipboard.writeText(command);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<div
			onClick={handleClick}
			style={{
				background: "var(--bg-panel)",
				border: "1px solid var(--border)",
				borderRadius: 6,
				padding: "1rem",
				cursor: "pointer",
				position: "relative",
			}}
		>
			<code style={{ fontSize: 13 }}>
				<span style={{ color: "var(--text-dim)" }}>$ </span>
				{command}
			</code>
			<span
				style={{
					position: "absolute",
					right: "1rem",
					top: "50%",
					transform: "translateY(-50%)",
					fontSize: 11,
					color: copied ? "var(--green)" : "var(--text-dim)",
				}}
			>
				{copied ? "copied!" : "click to copy"}
			</span>
		</div>
	);
}
