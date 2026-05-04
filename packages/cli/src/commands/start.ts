import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import chalk from "chalk";
import { loadHerzie } from "../storage/state.js";
import { isDaemonRunning, loadPid } from "../storage/pid.js";

export function runStart() {
	if (!loadHerzie()) {
		console.log(
			chalk.yellow("No Herzie found! Run ") +
				chalk.bold("herzies hatch") +
				chalk.yellow(" first."),
		);
		process.exit(1);
	}

	if (isDaemonRunning()) {
		console.log(
			chalk.yellow(`Daemon already running (pid ${loadPid()}). Use `) +
				chalk.bold("herzies stop") +
				chalk.yellow(" to restart."),
		);
		return;
	}

	const __dirname = dirname(fileURLToPath(import.meta.url));
	const daemonPath = join(__dirname, "daemon.js");

	const child = spawn(process.execPath, [daemonPath], {
		detached: true,
		stdio: "ignore",
	});

	child.unref();

	console.log(
		chalk.green("♫ Herzie daemon started!") +
			chalk.dim(` (pid ${child.pid})`),
	);
	console.log(
		chalk.dim(
			"  Your Herzie is now listening in the background.\n" +
				"  Run " +
				chalk.bold("herzies stop") +
				" to stop, or " +
				chalk.bold("herzies status") +
				" to check in.",
		),
	);
}
