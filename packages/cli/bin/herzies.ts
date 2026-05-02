#!/usr/bin/env node
import { Command } from "commander";
import {
	runFriendsAdd,
	runFriendsList,
	runFriendsRemove,
} from "../src/commands/friends.js";
import { runHatch } from "../src/commands/hatch.js";
import { runRegister } from "../src/commands/register.js";
import { runLogin } from "../src/commands/login.js";
import { runApp } from "../src/commands/run.js";
import { runStatus } from "../src/commands/status.js";

const program = new Command();

program
	.name("herzies")
	.description("A CLI pet that grows by listening to music")
	.version("0.1.0");

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
	.command("register")
	.description("Create an account to sync your Herzie online")
	.action(() => {
		runRegister();
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
