import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Herzie3D } from "./components/Herzie3D";

const WEARABLE_OPTIONS = ["headphones"];

function Sandbox() {
	const [userId, setUserId] = useState("sandbox-user");
	const [stage, setStage] = useState(1);
	const [size, setSize] = useState(5);
	const [animate, setAnimate] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const [wearables, setWearables] = useState<string[]>([]);

	const toggleWearable = (id: string) => {
		setWearables((prev) =>
			prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
		);
	};

	return (
		<div style={{ minHeight: "100vh", padding: "120px 16px 16px" }}>
			<div
				style={{
					position: "fixed",
					top: 12,
					left: 12,
					right: 12,
					zIndex: 10,
					display: "flex",
					gap: 16,
					flexWrap: "wrap",
					alignItems: "center",
					padding: "10px 12px",
					background: "rgba(0,0,0,0.5)",
					border: "1px solid #333",
					borderRadius: 6,
					fontSize: 12,
				}}
			>
				<label>
					userId:{" "}
					<input
						value={userId}
						onChange={(e) => setUserId(e.target.value)}
						style={inputStyle}
					/>
				</label>
				<label>
					stage:{" "}
					<input
						type="number"
						min={1}
						max={5}
						value={stage}
						onChange={(e) => setStage(Number(e.target.value))}
						style={{ ...inputStyle, width: 50 }}
					/>
				</label>
				<label>
					size:{" "}
					<input
						type="number"
						min={2}
						max={20}
						value={size}
						onChange={(e) => setSize(Number(e.target.value))}
						style={{ ...inputStyle, width: 50 }}
					/>
				</label>
				<label>
					<input
						type="checkbox"
						checked={animate}
						onChange={(e) => setAnimate(e.target.checked)}
					/>{" "}
					animate
				</label>
				<label>
					<input
						type="checkbox"
						checked={isPlaying}
						onChange={(e) => setIsPlaying(e.target.checked)}
					/>{" "}
					isPlaying (dance)
				</label>
				<div style={{ display: "flex", gap: 8 }}>
					wearables:
					{WEARABLE_OPTIONS.map((w) => (
						<label key={w}>
							<input
								type="checkbox"
								checked={wearables.includes(w)}
								onChange={() => toggleWearable(w)}
							/>{" "}
							{w}
						</label>
					))}
				</div>
			</div>

			<Herzie3D
				userId={userId}
				stage={stage}
				size={size}
				animate={animate}
				isPlaying={isPlaying}
				wearables={wearables}
			/>
		</div>
	);
}

const inputStyle: React.CSSProperties = {
	background: "#222",
	color: "#e0e0e0",
	border: "1px solid #444",
	padding: "2px 6px",
	fontFamily: "inherit",
	fontSize: 12,
};

const root = createRoot(document.getElementById("root")!);
root.render(<Sandbox />);
