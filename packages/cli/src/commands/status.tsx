import { Box, Text, render, useApp } from "ink";
import React, { useEffect } from "react";
import { loadHerzie } from "../storage/state.js";
import { HerzieDisplay } from "../ui/HerzieDisplay.js";
import { StatsPanel } from "../ui/StatsPanel.js";

function StatusApp() {
	const { exit } = useApp();
	const herzie = loadHerzie();

	useEffect(() => {
		// Auto-exit after render
		const timer = setTimeout(() => exit(), 100);
		return () => clearTimeout(timer);
	}, [exit]);

	if (!herzie) {
		return (
			<Box padding={1}>
				<Text color="yellow">
					No Herzie found! Run <Text bold>herzies hatch</Text> to get started.
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Box flexDirection="row">
				<Box flexDirection="column">
					<HerzieDisplay appearance={herzie.appearance} stage={herzie.stage} />
				</Box>
				<StatsPanel herzie={herzie} />
			</Box>
		</Box>
	);
}

export function runStatus() {
	render(<StatusApp />);
}
