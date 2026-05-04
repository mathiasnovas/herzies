"use client";

import { createSupabaseClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function AuthForm() {
	const searchParams = useSearchParams();
	const port = searchParams.get("port");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	async function handleGitHubLogin() {
		setError("");
		setLoading(true);

		const supabase = createSupabaseClient();
		const redirectTo = port
			? `${window.location.origin}/auth/callback?cli_port=${port}`
			: `${window.location.origin}/auth/callback`;

		const { error } = await supabase.auth.signInWithOAuth({
			provider: "github",
			options: { redirectTo },
		});

		if (error) {
			setError(error.message);
			setLoading(false);
		}
	}

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
					sign in
				</h1>
				<p style={{ fontSize: 12, color: "var(--text-dim)" }}>
					// log in to your account
				</p>
			</section>

			<div
				style={{
					background: "var(--bg-panel)",
					border: "1px solid var(--border)",
					borderRadius: 6,
					padding: "1.25rem",
					maxWidth: 400,
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
				}}
			>
				{error && (
					<p style={{ color: "var(--red)", fontSize: 12 }}>{error}</p>
				)}

				<button
					type="button"
					onClick={handleGitHubLogin}
					disabled={loading}
					style={{
						width: "100%",
						padding: "0.6rem",
						background: "var(--text)",
						color: "var(--bg)",
						border: "none",
						borderRadius: 4,
						fontFamily: "inherit",
						fontWeight: 700,
						fontSize: 13,
						cursor: loading ? "default" : "pointer",
						opacity: loading ? 0.6 : 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "0.5rem",
					}}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
					</svg>
					{loading ? "redirecting..." : "sign in with GitHub"}
				</button>

				<p style={{ fontSize: 11, color: "var(--text-dim)" }}>
					by signing in, you agree to the{" "}
					<a href="/terms" target="_blank" style={{ color: "var(--cyan)" }}>
						terms of service
					</a>
				</p>
			</div>
		</main>
	);
}

export default function CLIAuthPage() {
	return (
		<Suspense fallback={<p style={{ padding: "2rem" }}>Loading...</p>}>
			<AuthForm />
		</Suspense>
	);
}
