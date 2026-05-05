import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";
import type { Herzie } from "@herzies/shared";
import { getItem, RARITY_COLORS, RARITY_LABELS } from "../art/items.js";
import { ItemDisplay } from "./ItemDisplay.js";
import { isLoggedIn } from "../storage/supabase.js";
import { apiFetchInventory } from "../storage/api.js";

interface Props {
	herzie: Herzie;
	onBack: () => void;
	online?: boolean;
}

export function InventoryView({ herzie, onBack, online }: Props) {
	const [selected, setSelected] = useState(0);
	const [viewing, setViewing] = useState<string | null>(null);
	const [inventory, setInventory] = useState<string[] | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!isLoggedIn()) {
			setLoading(false);
			return;
		}
		apiFetchInventory().then((items) => {
			setInventory(items ?? []);
			setLoading(false);
		});
	}, []);

	useInput((_input, key) => {
		if (viewing) {
			if (key.escape || key.return || _input === "q") {
				setViewing(null);
			}
			return;
		}

		if (key.escape || _input === "q") {
			onBack();
			return;
		}

		if (!inventory) return;

		if (key.upArrow) {
			setSelected((s) => Math.max(0, s - 1));
		}
		if (key.downArrow) {
			setSelected((s) => Math.min(inventory.length - 1, s + 1));
		}
		if (key.return && inventory.length > 0) {
			setViewing(inventory[selected]);
		}
	});

	if (!isLoggedIn()) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="yellow">
					Log in to access your inventory. Run <Text bold>herzies login</Text>
				</Text>
				<Box marginTop={1}>
					<Text dimColor>Press q to go back</Text>
				</Box>
			</Box>
		);
	}

	if (online === false) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="yellow">
					Inventory is only available when online.
				</Text>
				<Box marginTop={1}>
					<Text dimColor>Press q to go back</Text>
				</Box>
			</Box>
		);
	}

	if (loading) {
		return (
			<Box padding={1}>
				<Text dimColor>Loading inventory...</Text>
			</Box>
		);
	}

	if (!inventory || inventory.length === 0) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text dimColor>No items yet — keep listening to earn some!</Text>
				<Box marginTop={1}>
					<Text dimColor>Press q to go back</Text>
				</Box>
			</Box>
		);
	}

	// Item detail view
	if (viewing) {
		const item = getItem(viewing);
		return (
			<Box flexDirection="column" padding={1}>
				<Box>
					<Text bold color={item ? RARITY_COLORS[item.rarity] : "magenta"}>
						{item?.name ?? viewing}
					</Text>
					{item && (
						<Text color={RARITY_COLORS[item.rarity]} dimColor>
							{" "}— {RARITY_LABELS[item.rarity]}
						</Text>
					)}
				</Box>
				{item?.description && (
					<Text dimColor italic>{item.description}</Text>
				)}
				<Box marginTop={1}>
					<ItemDisplay itemId={viewing} animate />
				</Box>
				<Box marginTop={1}>
					<Text dimColor>Press Esc or Enter to go back</Text>
				</Box>
			</Box>
		);
	}

	// List view
	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="magenta">
				♫ {herzie.name}'s inventory
			</Text>
			<Box marginTop={1} flexDirection="column">
				{inventory.map((id, i) => {
					const item = getItem(id);
					const isSelected = i === selected;
					return (
						<Box key={id}>
							<Text color={isSelected ? "yellow" : undefined}>
								{isSelected ? "▸ " : "  "}
							</Text>
							<Text color={item ? RARITY_COLORS[item.rarity] : undefined}>
								{item?.name ?? id}
							</Text>
						</Box>
					);
				})}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>↑↓ navigate · Enter to view · q to go back</Text>
			</Box>
		</Box>
	);
}
