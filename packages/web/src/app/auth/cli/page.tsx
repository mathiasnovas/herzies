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
	const [mode, setMode] = useState<"login" | "register">("register");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setLoading(true);

		const supabase = createSupabaseClient();

		const result =
			mode === "register"
				? await supabase.auth.signUp({ email, password })
				: await supabase.auth.signInWithPassword({ email, password });

		if (result.error) {
			setError(result.error.message);
			setLoading(false);
			return;
		}

		const session = result.data.session;
		if (session) {
			if (fromCli) {
				// Redirect back to the CLI's local server
				window.location.href = `http://127.0.0.1:${port}/callback?access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
			} else {
				// Web-only login — redirect to profile/success page
				window.location.href = "/auth/success";
			}
		} else {
			setError("Check your email to confirm your account, then log in.");
			setLoading(false);
		}
	}

	return (
		<main
			style={{
				maxWidth: 400,
				margin: "0 auto",
				padding: "4rem 2rem",
			}}
		>
			<h1 style={{ color: "#c77dff" }}>herzies</h1>
			<p>
				{mode === "register"
					? "Create an account to sync your Herzie"
					: "Log in to your account"}
			</p>

			<form onSubmit={handleSubmit}>
				<div style={{ marginBottom: "1rem" }}>
					<label>
						Email
						<br />
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							style={{
								width: "100%",
								padding: "0.5rem",
								background: "#16213e",
								color: "#e0e0e0",
								border: "1px solid #333",
								borderRadius: 4,
								fontFamily: "monospace",
							}}
						/>
					</label>
				</div>
				<div style={{ marginBottom: "1rem" }}>
					<label>
						Password
						<br />
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={6}
							style={{
								width: "100%",
								padding: "0.5rem",
								background: "#16213e",
								color: "#e0e0e0",
								border: "1px solid #333",
								borderRadius: 4,
								fontFamily: "monospace",
							}}
						/>
					</label>
				</div>

				{error && (
					<p style={{ color: "#ff6b6b" }}>{error}</p>
				)}

				<button
					type="submit"
					disabled={loading}
					style={{
						width: "100%",
						padding: "0.75rem",
						background: "#c77dff",
						color: "#1a1a2e",
						border: "none",
						borderRadius: 4,
						fontFamily: "monospace",
						fontWeight: "bold",
						fontSize: "1rem",
						cursor: "pointer",
					}}
				>
					{loading
						? "..."
						: mode === "register"
							? "Create account"
							: "Log in"}
				</button>
			</form>

			<p style={{ marginTop: "1rem", textAlign: "center" }}>
				<button
					onClick={() =>
						setMode(mode === "register" ? "login" : "register")
					}
					style={{
						background: "none",
						border: "none",
						color: "#7ec8e3",
						fontFamily: "monospace",
						cursor: "pointer",
					}}
				>
					{mode === "register"
						? "Already have an account? Log in"
						: "Need an account? Register"}
				</button>
			</p>
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
