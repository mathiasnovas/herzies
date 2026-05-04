import { Box, Text } from "ink";
import React from "react";
import { type Herzie, type Stage, levelProgress, xpToNextLevel, getActiveMultipliers, type ActiveMultiplier } from "@herzies/shared";

interface Props {
	herzie: Herzie;
}

const STAGE_NAMES: Record<Stage, string> = {
	1: "Baby",
	2: "Teen",
	3: "Champion",
};

function XpBar({ progress, width = 20 }: { progress: number; width?: number }) {
	const filled = Math.round(progress * width);
	const empty = width - filled;
	const bar = "█".repeat(filled) + "░".repeat(empty);
	return (
		<Text>
			<Text color="green">[{bar}]</Text>{" "}
			<Text color="yellow">{Math.round(progress * 100)}%</Text>
		</Text>
	);
}

export function StatsPanel({ herzie }: Props) {
	const progress = levelProgress(herzie);
	const toNext = xpToNextLevel(herzie);
	const totalHours = (herzie.totalMinutesListened / 60).toFixed(1);
	const activeMultipliers = getActiveMultipliers(new Date(), herzie.boostUntil);

	return (
		<Box flexDirection="column" paddingLeft={2}>
			{/* Name & stage */}
			<Box>
				<Text bold color="cyan">
					{herzie.name}
				</Text>
				<Text dimColor>
					{" "}
					— {STAGE_NAMES[herzie.stage]} (Stage {herzie.stage})
				</Text>
			</Box>

			{/* Level + XP */}
			<Box marginTop={1}>
				<Text>
					<Text bold>Level:</Text>{" "}
					<Text color="yellow">{herzie.level}</Text>
				</Text>
			</Box>
			<Box>
				<Text bold>XP: </Text>
				<XpBar progress={progress} />
				<Text dimColor> ({Math.ceil(toNext)} to next)</Text>
			</Box>

			{/* Music stats */}
			<Box marginTop={1}>
				<Text bold>Music: </Text>
				<Text color="magenta">
					{totalHours}h ({Math.floor(herzie.totalMinutesListened)} min)
				</Text>
			</Box>

			{/* Friend code */}
			<Box>
				<Text bold>Code: </Text>
				<Text color="cyan">{herzie.friendCode}</Text>
				<Text dimColor>
					{" "}
					({herzie.friendCodes.length} friendzie
					{herzie.friendCodes.length !== 1 ? "s" : ""}
					{herzie.friendCodes.length > 0
						? `, +${Math.min(herzie.friendCodes.length, 20) * 2}% XP`
						: ""}
					)
				</Text>
			</Box>

			{/* Active multipliers */}
			{activeMultipliers.length > 0 && (
				<Box marginTop={1} flexDirection="column">
					<Text bold color="yellow">Bonuses:</Text>
					{activeMultipliers.map((m) => (
						<Box key={m.name}>
							<Text color="yellow">  ★ {m.name}</Text>
							<Text color="green"> +{Math.round(m.bonus * 100)}% XP</Text>
						</Box>
					))}
				</Box>
			)}
		</Box>
	);
}
