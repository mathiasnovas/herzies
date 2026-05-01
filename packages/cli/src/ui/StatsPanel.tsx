import { Box, Text } from "ink";
import React from "react";
import { type Herzie, getDailyCraving, levelProgress, xpToNextLevel } from "@herzies/shared";

interface Props {
	herzie: Herzie;
}

function XpBar({ progress }: { progress: number }) {
	const width = 20;
	const filled = Math.round(progress * width);
	const empty = width - filled;
	const bar = "█".repeat(filled) + "░".repeat(empty);
	return (
		<Text>
			<Text color="green">[{bar}]</Text> <Text color="yellow">{Math.round(progress * 100)}%</Text>
		</Text>
	);
}

function getTopGenres(genreMinutes: Record<string, number>): [string, number][] {
	return Object.entries(genreMinutes)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 3);
}

export function StatsPanel({ herzie }: Props) {
	const progress = levelProgress(herzie);
	const toNext = xpToNextLevel(herzie);
	const topGenres = getTopGenres(herzie.genreMinutes);
	const craving = getDailyCraving(herzie.id);
	const totalHours = (herzie.totalMinutesListened / 60).toFixed(1);

	const stageNames: Record<number, string> = {
		1: "Baby",
		2: "Teen",
		3: "Champion",
	};

	return (
		<Box flexDirection="column" paddingLeft={2}>
			<Box>
				<Text bold color="cyan">
					{herzie.name}
				</Text>
				<Text dimColor>
					{" "}
					— {stageNames[herzie.stage]} (Stage {herzie.stage})
				</Text>
			</Box>

			<Box marginTop={1}>
				<Text>
					<Text bold>Level:</Text> <Text color="yellow">{herzie.level}</Text>
				</Text>
			</Box>

			<Box>
				<Text bold>XP: </Text>
				<XpBar progress={progress} />
				<Text dimColor> ({Math.ceil(toNext)} to next)</Text>
			</Box>

			<Box marginTop={1}>
				<Text bold>Music listened: </Text>
				<Text color="magenta">
					{totalHours} hours ({Math.floor(herzie.totalMinutesListened)} min)
				</Text>
			</Box>

			{topGenres.length > 0 && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold>Top genres:</Text>
					{topGenres.map(([genre, minutes], i) => (
						<Box key={genre} paddingLeft={1}>
							<Text>
								{["1.", "2.", "3."][i]} <Text color="white">{genre}</Text>{" "}
								<Text dimColor>({Math.floor(minutes)} min)</Text>
							</Text>
						</Box>
					))}
				</Box>
			)}

			<Box marginTop={1}>
				<Text bold>Craving today: </Text>
				<Text color="yellow">"{craving}"</Text>
				<Text dimColor> (+50% XP bonus!)</Text>
			</Box>

			<Box marginTop={1}>
				<Text bold>Friend code: </Text>
				<Text color="cyan">{herzie.friendCode}</Text>
				<Text dimColor>
					{" "}
					({herzie.friendCodes.length} friendzie
					{herzie.friendCodes.length !== 1 ? "s" : ""})
				</Text>
			</Box>
		</Box>
	);
}
