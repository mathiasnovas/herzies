"use client";

import { createSupabaseClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function CallbackHandler() {
	const searchParams = useSearchParams();
	const cliPort = searchParams.get("cli_port");
	const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
	const [error, setError] = useState("");

	useEffect(() => {
		async function handleCallback() {
			const supabase = createSupabaseClient();

			// Supabase puts the session in the URL hash after magic link click
			const { data: { session }, error } = await supabase.auth.getSession();

			if (error || !session) {
				setError(error?.message ?? "No session found. Try logging in again.");
				setStatus("error");
				return;
			}

			if (cliPort) {
				// Redirect tokens to the CLI's local server
				window.location.href = `http://127.0.0.1:${cliPort}/callback?access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
			} else {
				setStatus("success");
			}
		}

		handleCallback();
	}, [cliPort]);

	if (status === "loading") {
		return (
			<main style={{ maxWidth: 400, margin: "0 auto", padding: "4rem 2rem" }}>
				<h1 style={{ color: "#c77dff" }}>herzies</h1>
				<p>Logging you in...</p>
			</main>
		);
	}

	if (status === "error") {
		return (
			<main style={{ maxWidth: 400, margin: "0 auto", padding: "4rem 2rem" }}>
				<h1 style={{ color: "#c77dff" }}>herzies</h1>
				<p style={{ color: "#ff6b6b" }}>{error}</p>
			</main>
		);
	}

	return (
		<main style={{ maxWidth: 400, margin: "0 auto", padding: "4rem 2rem" }}>
			<h1 style={{ color: "#c77dff" }}>herzies</h1>
			<p style={{ color: "#4ade80" }}>You're logged in!</p>
			<p>
				Run{" "}
				<code style={{ background: "#16213e", padding: "0.2rem 0.5rem", borderRadius: 4 }}>
					herzies login
				</code>{" "}
				in your terminal to sync your Herzie.
			</p>
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
