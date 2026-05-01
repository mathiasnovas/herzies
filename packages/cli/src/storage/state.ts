import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Herzie } from "@herzies/shared";

const CONFIG_DIR = join(homedir(), ".config", "herzies");
const HERZIE_FILE = join(CONFIG_DIR, "herzie.json");
const SESSION_FILE = join(CONFIG_DIR, "session.json");

function ensureDir() {
	if (!existsSync(CONFIG_DIR)) {
		mkdirSync(CONFIG_DIR, { recursive: true });
	}
}

export function loadHerzie(): Herzie | null {
	ensureDir();
	if (!existsSync(HERZIE_FILE)) return null;
	try {
		return JSON.parse(readFileSync(HERZIE_FILE, "utf-8"));
	} catch {
		return null;
	}
}

export function saveHerzie(herzie: Herzie): void {
	ensureDir();
	writeFileSync(HERZIE_FILE, JSON.stringify(herzie, null, 2));
}

export interface SessionData {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
	userId: string;
}

export function loadSession(): SessionData | null {
	ensureDir();
	if (!existsSync(SESSION_FILE)) return null;
	try {
		return JSON.parse(readFileSync(SESSION_FILE, "utf-8"));
	} catch {
		return null;
	}
}

export function saveSession(session: SessionData): void {
	ensureDir();
	writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
}

export function clearSession(): void {
	ensureDir();
	if (existsSync(SESSION_FILE)) {
		writeFileSync(SESSION_FILE, "{}");
	}
}

export function getConfigDir(): string {
	return CONFIG_DIR;
}
