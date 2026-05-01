"use client";

import { createSupabaseClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function AuthForm() {
	const searchParams = useSearchParams();
	const port = searchParams.get("port");
	const fromCli = !!port;
	const [email, setEmail] = useState("");
	const [error, setError] = useState("");
	const [sent, setSent] = useState(false);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setLoading(true);

		const supabase = createSupabaseClient();

		// Magic link — redirects back to /auth/callback which handles the token
		const redirectTo = fromCli
			? `${window.location.origin}/auth/callback?cli_port=${port}`
			: `${window.location.origin}/auth/callback`;

		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: redirectTo },
		});

		if (error) {
			setError(error.message);
			setLoading(false);
			return;
		}

		setSent(true);
		setLoading(false);
	}

	if (sent) {
		return (
			<main style={{ maxWidth: 400, margin: "0 auto", padding: "4rem 2rem" }}>
				<h1 style={{ color: "#c77dff" }}>herzies</h1>
				<p style={{ color: "#4ade80" }}>Check your email!</p>
				<p>
					We sent a magic link to <strong>{email}</strong>.
					Click it to log in.
				</p>
				{fromCli && (
					<p style={{ color: "#7ec8e3", marginTop: "1rem" }}>
						Keep your terminal open — it will connect automatically.
					</p>
				)}
			</main>
		);
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
			<p>Enter your email to log in or create an account.</p>

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
					{loading ? "..." : "Send magic link"}
				</button>
			</form>
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
