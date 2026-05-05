import { createInterface } from "node:readline";
import { Box, Text, render, useApp } from "ink";
import React, { useEffect } from "react";
import { composeHerzie } from "../art/composer.js";
import { createHerzie } from "../core/herzie.js";
import { apiIsNameTaken, apiSync } from "../storage/api.js";
import { loadHerzie, saveHerzie } from "../storage/state.js";
import { validateName } from "@herzies/shared";
import type { Herzie } from "@herzies/shared";

const EGG_FRAMES = [
	`

  ╭─╮
  │ │
  │ │
  ╰─╯
`,
	`

  ╭─╮
  │∙│
  │ │
  ╰─╯
`,
	`
   ∗
  ╭─╮
  │∙│
  │∙│
  ╰─╯
`,
	`
  ∗ ∗
  ╭╌╮
 ╱ ∙ ╲
 ╲ ∙ ╱
  ╰╌╯
`,
	`
 ∗ ∗ ∗
  ╱ ╲
 ╱ ✦ ╲
 ╲   ╱
  ╲ ╱
 ∗ ∗ ∗
`,
];

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function RevealApp({ herzie }: { herzie: Herzie }) {
	const { exit } = useApp();
	const art = composeHerzie(herzie.appearance, herzie.stage);

	useEffect(() => {
		const timer = setTimeout(() => exit(), 100);
		return () => clearTimeout(timer);
	}, [exit]);

	return (
		<Box flexDirection="column" padding={1}>
			<Text color="green" bold>
				✨ {herzie.name} has hatched! ✨
			</Text>
			<Box marginTop={1}>
				<Text>{art}</Text>
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text>
					<Text bold>Friend code:</Text>{" "}
					<Text color="cyan">{herzie.friendCode}</Text>
				</Text>
				<Text dimColor>
					Share this code so others can add you as a friendzie!
				</Text>
			</Box>
			<Box marginTop={1}>
				<Text dimColor>
					Run <Text bold>herzies status</Text> to check on your Herzie,{" "}
					<Text bold>herzies listen</Text> to start growing!
				</Text>
			</Box>
		</Box>
	);
}

async function prompt(question: string): Promise<string> {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

export async function runHatch() {
	const existing = loadHerzie();
	if (existing) {
		console.log(
			`\nYou already have a Herzie named \x1b[1m${existing.name}\x1b[0m!`,
		);
		console.log("Run `herzies status` to see them.\n");
		return;
	}

	console.log("\n\x1b[35m\x1b[1m🥚 A mysterious egg has appeared!\x1b[0m\n");
	console.log(EGG_FRAMES[0]);

	let name = "";
	while (true) {
		name = await prompt("Give your Herzie a name: ");

		const validationError = validateName(name);
		if (validationError) {
			console.log(`\x1b[31m${validationError}\x1b[0m`);
			continue;
		}

		if (await apiIsNameTaken(name)) {
			console.log(`\x1b[31mThe name "${name}" is already taken. Try another!\x1b[0m`);
			continue;
		}

		break;
	}

	// Hatching animation
	for (let i = 1; i < EGG_FRAMES.length; i++) {
		process.stdout.write("\x1b[2J\x1b[H"); // clear screen
		console.log(`\n\x1b[33m\x1b[1mThe egg is hatching...!\x1b[0m\n`);
		console.log(EGG_FRAMES[i]);
		await sleep(400);
	}

	process.stdout.write("\x1b[2J\x1b[H"); // clear screen

	const herzie = createHerzie(name);
	saveHerzie(herzie);

	// Sync online if logged in
	await apiSync(null, 0, []);

	render(<RevealApp herzie={herzie} />);

	// Give Ink a moment to flush output
	await sleep(200);

	// Offer to enable autostart
	if (process.platform === "darwin") {
		const answer = await prompt(
			"\nStart listening automatically on login? (Y/n) ",
		);
		if (answer === "" || answer.toLowerCase() === "y") {
			const { runAutostart } = await import("./autostart.js");
			runAutostart("on");
			const { runStart } = await import("./start.js");
			runStart();
		}
	}
}
