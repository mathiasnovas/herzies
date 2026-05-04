import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

const HMAC_SALT = "hrzs_v1_8f3a2c";

/** Compute HMAC over the cheat-sensitive fields of a herzie */
function computeSignature(herzie: Herzie): string {
	const payload = JSON.stringify({
		id: herzie.id,
		xp: herzie.xp,
		level: herzie.level,
		stage: herzie.stage,
		totalMinutesListened: herzie.totalMinutesListened,
		genreMinutes: herzie.genreMinutes,
	});
	return createHmac("sha256", `${HMAC_SALT}:${herzie.id}`)
		.update(payload)
		.digest("hex");
}

export function loadHerzie(): Herzie | null {
	ensureDir();
	if (!existsSync(HERZIE_FILE)) return null;
	try {
		const raw = JSON.parse(readFileSync(HERZIE_FILE, "utf-8"));
		const { _sig, ...herzie } = raw as Herzie & { _sig?: string };
		if (!_sig || _sig !== computeSignature(herzie)) {
			// Tampered or unsigned — reset progress fields
			herzie.xp = 0;
			herzie.level = 1;
			herzie.stage = 1;
			herzie.totalMinutesListened = 0;
			herzie.genreMinutes = {};
		}
		return herzie;
	} catch {
		return null;
	}
}

export function saveHerzie(herzie: Herzie): void {
	ensureDir();
	const data = { ...herzie, _sig: computeSignature(herzie) };
	writeFileSync(HERZIE_FILE, JSON.stringify(data, null, 2));
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
		const data = JSON.parse(readFileSync(SESSION_FILE, "utf-8"));
		if (!data?.accessToken || !data?.userId) return null;
		return data;
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

export function deleteLocalData(): void {
	if (existsSync(CONFIG_DIR)) {
		rmSync(CONFIG_DIR, { recursive: true });
	}
}

export function getConfigDir(): string {
	return CONFIG_DIR;
}
