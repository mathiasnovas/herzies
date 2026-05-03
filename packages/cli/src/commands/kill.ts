import { createInterface } from "node:readline";
import { loadHerzie, deleteLocalData } from "../storage/state.js";
import { deleteHerzie, isLoggedIn } from "../storage/supabase.js";

function confirm(prompt: string): Promise<boolean> {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	return new Promise((resolve) => {
		rl.question(prompt, (answer) => {
			rl.close();
			resolve(answer.trim().toLowerCase() === "y");
		});
	});
}

export async function runKill() {
	const herzie = loadHerzie();
	if (!herzie) {
		console.log("\nYou don't have a Herzie to kill.\n");
		return;
	}

	console.log(`\n\x1b[31m\x1b[1mThis will permanently kill ${herzie.name}.\x1b[0m`);
	console.log("All local data will be deleted.");
	if (isLoggedIn()) {
		console.log("Your herzie will also be removed from the server and the leaderboard.");
	}
	console.log("");

	const confirmed = await confirm(`Type y to confirm: `);
	if (!confirmed) {
		console.log("\nCancelled. Your Herzie lives on!\n");
		return;
	}

	if (isLoggedIn()) {
		const deleted = await deleteHerzie();
		if (!deleted) {
			console.log("\n\x1b[31mFailed to delete server data. Try again later.\x1b[0m\n");
			return;
		}
	}

	deleteLocalData();
	console.log(`\n\x1b[2m${herzie.name} is gone. Farewell.\x1b[0m\n`);
}
