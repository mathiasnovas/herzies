import { createServer } from "node:http";
import { URL } from "node:url";
import { Box, Text, render, useApp } from "ink";
import open from "open";
import React, { useEffect, useState } from "react";
import { loadHerzie } from "../storage/state.js";
import { saveSession } from "../storage/state.js";
import { getSupabase, syncHerzie } from "../storage/supabase.js";

const CALLBACK_PORT = 8974;

function RegisterApp() {
	const { exit } = useApp();
	const [status, setStatus] = useState<
		"checking" | "opening" | "waiting" | "success" | "error"
	>("checking");
	const [error, setError] = useState("");

	useEffect(() => {
		const sb = getSupabase();
		setStatus("opening");

		// Start a local server to receive the auth callback
		const server = createServer(async (req, res) => {
			const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

			if (url.pathname === "/callback") {
				const accessToken = url.searchParams.get("access_token");
				const refreshToken = url.searchParams.get("refresh_token");

				if (!accessToken) {
					res.writeHead(200, { "Content-Type": "text/html" });
					res.end(
						"<h1>Registration failed. You can close this window.</h1>",
					);
					setError("No token received.");
					setStatus("error");
					server.close();
					setTimeout(() => exit(), 100);
					return;
				}

				// Get user info
				const { data: { user } } = await sb.auth.getUser(accessToken);

				if (user) {
					saveSession({
						accessToken,
						refreshToken: refreshToken ?? "",
						expiresAt: Date.now() + 3600000,
						userId: user.id,
					});

					// Sync herzie if exists
					const herzie = loadHerzie();
					if (herzie) {
						await syncHerzie({
							name: herzie.name,
							friendCode: herzie.friendCode,
							stage: herzie.stage,
							level: herzie.level,
						});
					}
				}

				res.writeHead(200, { "Content-Type": "text/html" });
				res.end(
					"<h1>Registered! You can close this window and return to the terminal.</h1>",
				);
				setStatus("success");
				server.close();
				setTimeout(() => exit(), 500);
			}
		});

		server.listen(CALLBACK_PORT, () => {
			setStatus("waiting");
			// Open the Supabase auth page — the web app will handle the redirect
			const authUrl = `${process.env.HERZIES_WEB_URL ?? "https://herzies-web.vercel.app"}/auth/cli?port=${CALLBACK_PORT}`;
			open(authUrl);
		});

		setTimeout(() => {
			server.close();
			if (status === "waiting") {
				setError("Timed out waiting for auth.");
				setStatus("error");
				setTimeout(() => exit(), 100);
			}
		}, 120000);
	}, []);

	return (
		<Box padding={1} flexDirection="column">
			{status === "checking" && (
				<Text dimColor>Checking configuration...</Text>
			)}
			{status === "opening" && (
				<Text color="yellow">Opening browser for registration...</Text>
			)}
			{status === "waiting" && (
				<Text color="yellow">
					Waiting for registration in your browser...
				</Text>
			)}
			{status === "success" && (
				<Text color="green" bold>
					Registered! Your Herzie is now synced online.
				</Text>
			)}
			{status === "error" && <Text color="red">{error}</Text>}
		</Box>
	);
}

export function runRegister() {
	render(<RegisterApp />);
}
