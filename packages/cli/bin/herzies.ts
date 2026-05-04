#!/usr/bin/env node
import { createRequire } from "node:module";
import { Command } from "commander";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");
import {
	runFriendsAdd,
	runFriendsList,
	runFriendsRemove,
} from "../src/commands/friends.js";
import { runHatch } from "../src/commands/hatch.js";
import { runLogin } from "../src/commands/login.js";
import { runKill } from "../src/commands/kill.js";
import { runApp } from "../src/commands/run.js";
import { runAutostart } from "../src/commands/autostart.js";
import { runStart } from "../src/commands/start.js";
import { runStop } from "../src/commands/stop.js";
import { runStatus } from "../src/commands/status.js";

const program = new Command();

program
	.name("herzies")
	.description("A digital pet that lives in your terminal that grows by listening to music")
	.version(version);

program
	.command("hatch")
	.description("Hatch a new Herzie")
	.action(() => {
		runHatch();
	});

program
	.command("status")
	.description("Quick snapshot of your Herzie")
	.action(() => {
		runStatus();
	});

program
	.command("login")
	.description("Log in to sync your Herzie from another device")
	.action(() => {
		runLogin();
	});

const friendsCmd = program
	.command("friends")
	.description("Manage your friendzies")
	.action(() => {
		runFriendsList();
	});

friendsCmd
	.command("add <code>")
	.description("Add a friendzie by their code")
	.action((code: string) => {
		runFriendsAdd(code);
	});

friendsCmd
	.command("remove <code>")
	.description("Remove a friendzie")
	.action((code: string) => {
		runFriendsRemove(code);
	});

program
	.command("start")
	.description("Start background listening (no terminal needed)")
	.action(() => {
		runStart();
	});

program
	.command("autostart [action]")
	.description("Auto-start daemon on login (on/off)")
	.action((action?: string) => {
		runAutostart(action ?? "");
	});

program
	.command("stop")
	.description("Stop background listening")
	.action(() => {
		runStop();
	});

program
	.command("kill")
	.description("Permanently delete your Herzie and all data")
	.action(() => {
		runKill();
	});

program
	.command("help")
	.description("Show available commands")
	.action(() => {
		program.outputHelp();
	});

// Default: launch the live dashboard
program.action(() => {
	runApp();
});

program.parse();
