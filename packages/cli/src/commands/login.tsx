import { createServer } from "node:http";
import { URL } from "node:url";
import { Box, Text, render, useApp } from "ink";
import open from "open";
import React, { useEffect, useState } from "react";
import type { Herzie } from "@herzies/shared";
import { saveHerzie, saveSession } from "../storage/state.js";
import { getSupabase } from "../storage/supabase.js";

const CALLBACK_PORT = 8974;

function LoginApp() {
	const { exit } = useApp();
	const [status, setStatus] = useState<
		"opening" | "waiting" | "syncing" | "success" | "error"
	>("opening");
	const [error, setError] = useState("");
	const [synced, setSynced] = useState<string | null>(null);

	useEffect(() => {
		const sb = getSupabase();
		if (!sb) {
			setError(
				"Supabase not configured. Set HERZIES_SUPABASE_URL and HERZIES_SUPABASE_ANON_KEY.",
			);
			setStatus("error");
			setTimeout(() => exit(), 100);
			return;
		}

		const server = createServer(async (req, res) => {
			const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

			if (url.pathname === "/callback" && req.method === "POST") {
				// Read POST body containing tokens
				const body = await new Promise<string>((resolve) => {
					let data = "";
					req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
					req.on("end", () => resolve(data));
				});
				const params = new URLSearchParams(body);
				const accessToken = params.get("access_token");
				const refreshToken = params.get("refresh_token");

				if (!accessToken) {
					res.writeHead(200, { "Content-Type": "text/html" });
					res.end("<h1>Login failed. You can close this window.</h1>");
					setError("No token received.");
					setStatus("error");
					server.close();
					setTimeout(() => exit(), 100);
					return;
				}

				const { data: { user } } = await sb.auth.getUser(accessToken);

				if (!user) {
					res.writeHead(200, { "Content-Type": "text/html" });
					res.end("<h1>Login failed. You can close this window.</h1>");
					setError("Could not get user.");
					setStatus("error");
					server.close();
					setTimeout(() => exit(), 100);
					return;
				}

				saveSession({
					accessToken,
					refreshToken: refreshToken ?? "",
					expiresAt: Date.now() + 3600000,
					userId: user.id,
				});

				setStatus("syncing");

				// Pull the user's herzie from the server
				const { data: herzieData } = await sb
					.from("herzies")
					.select("*")
					.eq("user_id", user.id)
					.single();

				if (herzieData) {
					const herzie: Herzie = {
						id: herzieData.id,
						name: herzieData.name,
						createdAt: herzieData.created_at,
						appearance: herzieData.appearance,
						xp: herzieData.xp,
						level: herzieData.level,
						stage: herzieData.stage,
						totalMinutesListened: herzieData.total_minutes_listened,
						genreMinutes: herzieData.genre_minutes ?? {},
						friendCode: herzieData.friend_code,
						friendCodes: herzieData.friend_codes ?? [],
						lastCravingDate: herzieData.last_craving_date ?? "",
						lastCravingGenre: herzieData.last_craving_genre ?? "",
					};
					saveHerzie(herzie);
					setSynced(herzie.name);
				}

				res.writeHead(200, { "Content-Type": "text/html" });
				res.end(
					"<h1>Logged in! Return to your terminal.</h1>",
				);
				setStatus("success");
				server.close();
				setTimeout(() => exit(), 500);
			}
		});

		server.listen(CALLBACK_PORT, () => {
			setStatus("waiting");
			const authUrl = `${process.env.HERZIES_WEB_URL ?? "https://herzies-web.vercel.app"}/auth/cli?port=${CALLBACK_PORT}`;
			open(authUrl);
		});

		setTimeout(() => {
			server.close();
		}, 120000);
	}, []);

	return (
		<Box padding={1} flexDirection="column">
			{status === "opening" && (
				<Text color="yellow">Opening browser...</Text>
			)}
			{status === "waiting" && (
				<Text color="yellow">Waiting for login in your browser...</Text>
			)}
			{status === "syncing" && (
				<Text color="yellow">Syncing your Herzie...</Text>
			)}
			{status === "success" && (
				<Box flexDirection="column">
					<Text color="green" bold>
						Logged in!
					</Text>
					{synced && (
						<Text>
							Synced your Herzie: <Text bold color="cyan">{synced}</Text>
						</Text>
					)}
				</Box>
			)}
			{status === "error" && <Text color="red">{error}</Text>}
		</Box>
	);
}

export function runLogin() {
	const { waitUntilExit } = render(<LoginApp />);
	waitUntilExit().then(() => process.exit(0));
}
