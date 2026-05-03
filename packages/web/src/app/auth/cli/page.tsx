"use client";

import { createSupabaseClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function AuthForm() {
	const searchParams = useSearchParams();
	const port = searchParams.get("port");
	const fromCli = !!port;
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setLoading(true);

		const supabase = createSupabaseClient();
		const result = await supabase.auth.signInWithPassword({ email, password });

		if (result.error) {
			setError(result.error.message);
			setLoading(false);
			return;
		}

		const session = result.data.session;
		if (session) {
			if (fromCli) {
				window.location.href = `http://127.0.0.1:${port}/callback?access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
			} else {
				window.location.href = `/auth/callback`;
			}
		} else {
			setError("Something went wrong. Try again.");
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
				}}
			>
				<form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
					<div>
						<label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
							email
						</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							style={{
								width: "100%",
								padding: "0.5rem 0.75rem",
								background: "var(--bg)",
								color: "var(--text)",
								border: "1px solid var(--border)",
								borderRadius: 4,
								fontFamily: "inherit",
								fontSize: 13,
							}}
						/>
					</div>
					<div>
						<label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
							password
						</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={6}
							style={{
								width: "100%",
								padding: "0.5rem 0.75rem",
								background: "var(--bg)",
								color: "var(--text)",
								border: "1px solid var(--border)",
								borderRadius: 4,
								fontFamily: "inherit",
								fontSize: 13,
							}}
						/>
					</div>

					{error && (
						<p style={{ color: "var(--red)", fontSize: 12 }}>{error}</p>
					)}

					<button
						type="submit"
						disabled={loading}
						style={{
							width: "100%",
							padding: "0.6rem",
							background: "var(--purple)",
							color: "var(--bg)",
							border: "none",
							borderRadius: 4,
							fontFamily: "inherit",
							fontWeight: 700,
							fontSize: 13,
							cursor: loading ? "default" : "pointer",
							opacity: loading ? 0.6 : 1,
						}}
					>
						{loading ? "..." : "log in"}
					</button>
				</form>
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
