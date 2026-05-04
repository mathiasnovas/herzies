"use client";

import { createSupabaseClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

const panel = {
	background: "var(--bg-panel)",
	border: "1px solid var(--border)",
	borderRadius: 6,
	padding: "1.25rem",
	maxWidth: 400,
} as const;

function CallbackHandler() {
	const searchParams = useSearchParams();
	const cliPort = searchParams.get("cli_port");
	const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
	const [error, setError] = useState("");

	useEffect(() => {
		async function handleCallback() {
			const supabase = createSupabaseClient();

			const { data: { session }, error } = await supabase.auth.getSession();

			if (error || !session) {
				setError(error?.message ?? "No session found. Try logging in again.");
				setStatus("error");
				return;
			}

			if (cliPort) {
				window.location.href = `http://127.0.0.1:${cliPort}/callback?access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
			} else {
				setStatus("success");
			}
		}

		handleCallback();
	}, [cliPort]);

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
			{status === "loading" && (
				<>
					<section>
						<h1 style={{ fontSize: 18, color: "var(--purple)", marginBottom: 4 }}>
							logging in
						</h1>
						<p style={{ fontSize: 12, color: "var(--text-dim)" }}>
							// hang tight
						</p>
					</section>
					<div style={panel}>
						<p style={{ fontSize: 13, color: "var(--text-dim)" }}>...</p>
					</div>
				</>
			)}

			{status === "error" && (
				<>
					<section>
						<h1 style={{ fontSize: 18, color: "var(--red)", marginBottom: 4 }}>
							something went wrong
						</h1>
						<p style={{ fontSize: 12, color: "var(--text-dim)" }}>
							// login failed
						</p>
					</section>
					<div style={{ ...panel, borderColor: "var(--red)" }}>
						<p style={{ fontSize: 13, color: "var(--red)" }}>{error}</p>
					</div>
				</>
			)}

			{status === "success" && (
				<>
					<section>
						<h1 style={{ fontSize: 18, color: "var(--green)", marginBottom: 4 }}>
							you're in
						</h1>
						<p style={{ fontSize: 12, color: "var(--text-dim)" }}>
							// logged in successfully
						</p>
					</section>
					<div style={panel}>
						<p style={{ fontSize: 13 }}>
							Run{" "}
							<code style={{
								background: "var(--bg)",
								padding: "0.15rem 0.4rem",
								borderRadius: 4,
								fontSize: 12,
							}}>
								herzies login
							</code>{" "}
							in your terminal to sync your herzie.
						</p>
					</div>
				</>
			)}
		</main>
	);
}

export default function AuthCallbackPage() {
	return (
		<Suspense fallback={<p style={{ padding: "2rem" }}>Loading...</p>}>
			<CallbackHandler />
		</Suspense>
	);
}
