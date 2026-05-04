"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { HerzieArt } from "../../HerzieArt";

const POLL_INTERVAL = 10_000;

const STAGE_LABELS: Record<number, string> = {
	1: "baby",
	2: "teen",
	3: "champion",
};

const STAGE_COLORS: Record<number, string> = {
	1: "var(--yellow)",
	2: "var(--cyan)",
	3: "var(--purple)",
};

interface HerzieRow {
	name: string;
	stage: number;
	level: number;
	xp: number;
	appearance: {
		headIndex: number;
		eyesIndex: number;
		mouthIndex: number;
		accessoryIndex: number;
		limbsIndex?: number;
		bodyIndex?: number;
		legsIndex?: number;
		colorScheme: string;
	};
	total_minutes_listened: number;
	genre_minutes: Record<string, number>;
	friend_code: string;
	friend_codes: string[];
	now_playing: { title: string; artist: string } | null;
	created_at: string;
}

interface FriendProfile {
	name: string;
	friend_code: string;
	stage: number;
	level: number;
	now_playing: { title: string; artist: string } | null;
}

function formatMinutes(mins: number): string {
	if (mins < 60) return `${Math.floor(mins)}m`;
	const h = Math.floor(mins / 60);
	const m = Math.floor(mins % 60);
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function daysSince(dateStr: string): number {
	return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function HerzieDetail({ herzie: initial }: { herzie: HerzieRow }) {
	const [herzie, setHerzie] = useState(initial);
	const [friends, setFriends] = useState<FriendProfile[]>([]);

	const refresh = useCallback(async () => {
		const supabase = createSupabaseClient();
		const { data } = await supabase
			.from("herzies")
			.select("name, stage, level, xp, appearance, total_minutes_listened, genre_minutes, friend_code, friend_codes, now_playing, created_at")
			.eq("name", initial.name)
			.single();
		if (data) setHerzie(data as HerzieRow);
	}, [initial.name]);

	// Fetch friends
	useEffect(() => {
		if (herzie.friend_codes.length === 0) return;
		const supabase = createSupabaseClient();
		supabase
			.from("herzies")
			.select("name, friend_code, stage, level, now_playing")
			.in("friend_code", herzie.friend_codes)
			.then(({ data }) => {
				if (data) setFriends(data as FriendProfile[]);
			});
	}, [herzie.friend_codes]);

	// Poll for updates
	useEffect(() => {
		const interval = setInterval(refresh, POLL_INTERVAL);
		return () => clearInterval(interval);
	}, [refresh]);

	const age = daysSince(herzie.created_at);

	return (
		<main
			style={{
				maxWidth: 800,
				margin: "0 auto",
				padding: "3rem 1.5rem",
				display: "flex",
				flexDirection: "column",
				gap: "1.5rem",
			}}
		>
			{/* Header: art + info */}
			<div
				style={{
					display: "flex",
					gap: "2rem",
					alignItems: "flex-start",
					flexWrap: "wrap",
				}}
			>
				<div style={{ flexShrink: 0 }}>
					<HerzieArt
						appearance={herzie.appearance}
						stage={herzie.stage}
						size={14}
						animate={!!herzie.now_playing}
					/>
				</div>

				<div style={{ flex: 1, minWidth: 200 }}>
					<h1 style={{ fontSize: 22, margin: 0 }}>{herzie.name}</h1>
					<div
						style={{
							fontSize: 13,
							color: STAGE_COLORS[herzie.stage],
							marginTop: 4,
						}}
					>
						{STAGE_LABELS[herzie.stage]} (stage {herzie.stage})
					</div>

					<div
						style={{
							display: "flex",
							gap: "1.5rem",
							marginTop: 16,
							flexWrap: "wrap",
						}}
					>
						<Stat label="level" value={String(herzie.level)} color="var(--yellow)" />
						<Stat label="listened" value={formatMinutes(herzie.total_minutes_listened)} color="var(--green)" />
						<Stat label="age" value={`${age}d`} color="var(--text-dim)" />
						<Stat label="friendzies" value={String(herzie.friend_codes.length)} color="var(--cyan)" />
					</div>

					{/* Now playing */}
					{herzie.now_playing && (
						<div
							style={{
								marginTop: 16,
								fontSize: 13,
								color: "var(--green)",
							}}
						>
							&#9834; {herzie.now_playing.title}
							<span style={{ color: "var(--text-dim)" }}>
								{" "}— {herzie.now_playing.artist}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Friends */}
			<Panel title={`friendzies (${herzie.friend_codes.length})`}>
				{herzie.friend_codes.length === 0 ? (
					<p style={{ color: "var(--text-dim)", fontSize: 13, margin: 0 }}>
						no friendzies yet.
					</p>
				) : (
					<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
						{friends.map((f) => (
							<a
								key={f.friend_code}
								href={`/herzie/${encodeURIComponent(f.name)}`}
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									fontSize: 13,
									textDecoration: "none",
									color: "inherit",
									padding: "6px 8px",
									borderRadius: 4,
									background: "var(--bg)",
								}}
							>
								<span>
									<span style={{ color: "var(--cyan)" }}>{f.name}</span>
									<span style={{ color: "var(--text-dim)" }}>
										{" "}lv.{f.level} {STAGE_LABELS[f.stage]}
									</span>
								</span>
								{f.now_playing && (
									<span style={{ color: "var(--green)", fontSize: 12 }}>
										&#9834; {f.now_playing.title}
									</span>
								)}
							</a>
						))}
						{/* Show friend codes that weren't found */}
						{herzie.friend_codes
							.filter((code) => !friends.find((f) => f.friend_code === code))
							.map((code) => (
								<div
									key={code}
									style={{
										fontSize: 13,
										color: "var(--text-dim)",
										padding: "6px 8px",
									}}
								>
									{code} — offline
								</div>
							))}
					</div>
				)}
			</Panel>
		</main>
	);
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
	return (
		<div>
			<div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
			<div style={{ fontSize: 11, color: "var(--text-dim)" }}>{label}</div>
		</div>
	);
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div
			style={{
				background: "var(--bg-panel)",
				border: "1px solid var(--border)",
				borderRadius: 6,
				padding: "1rem",
			}}
		>
			<h2
				style={{
					fontSize: 13,
					color: "var(--text-dim)",
					margin: "0 0 12px 0",
					fontWeight: 400,
				}}
			>
				// {title}
			</h2>
			{children}
		</div>
	);
}
