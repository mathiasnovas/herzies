import { useState } from "react";
import { type AppState, herzies } from "../tauri-bridge";
import { btnStyle } from "./styles";

export function SettingsView({
	state,
	stageOverride,
	onStageOverride,
}: {
	state: AppState;
	stageOverride: number | null;
	onStageOverride: (v: number | null) => void;
}) {
	const [loggingIn, setLoggingIn] = useState(false);

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<div
				style={{
					fontSize: 13,
					fontWeight: "bold",
					color: "#e0e0e0",
					marginBottom: 12,
				}}
			>
				Settings
			</div>

			{/* Account */}
			<div style={{ marginBottom: 16 }}>
				<div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
					Account
				</div>
				{state.isOnline ? (
					<button
						style={{ ...btnStyle, color: "#f87171" }}
						onClick={() => herzies.logout()}
					>
						Logout
					</button>
				) : (
					<button
						style={{ ...btnStyle, color: "#4ade80" }}
						disabled={loggingIn}
						onClick={async () => {
							setLoggingIn(true);
							await herzies.login();
							setLoggingIn(false);
						}}
					>
						{loggingIn ? "Logging in..." : "Login"}
					</button>
				)}
			</div>

			{/* Debug */}
			<div style={{ marginBottom: 16 }}>
				<div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
					Debug
				</div>
				<div style={{ display: "flex", gap: 4 }}>
					<button style={btnStyle} onClick={() => herzies.testNotification()}>
						Test Notification
					</button>
					<button style={btnStyle} onClick={() => herzies.testActivity()}>
						Test Activity Log
					</button>
				</div>
			</div>

			{/* Dev-only stage selector */}
			{import.meta.env.DEV && (
				<div style={{ marginBottom: 16 }}>
					<div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
						Stage Preview
					</div>
					<div style={{ display: "flex", gap: 4 }}>
						{[null, 1, 2, 3].map((s) => (
							<button
								key={s ?? "default"}
								style={{
									...btnStyle,
									color: stageOverride === s ? "#7dd3fc" : "#888",
									borderColor: stageOverride === s ? "#7dd3fc" : "#555",
								}}
								onClick={() => onStageOverride(s)}
							>
								{s === null ? "Default" : `Stage ${s}`}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Quit */}
			<div style={{ marginTop: "auto", marginBottom: 8 }}>
				<button
					style={{ ...btnStyle, color: "#f87171" }}
					onClick={() => herzies.quit()}
				>
					Quit Herzies
				</button>
			</div>

			{/* Version */}
			<div style={{ fontSize: 11, color: "#555" }}>
				Herzies Desktop v{state.version}
			</div>
		</div>
	);
}
