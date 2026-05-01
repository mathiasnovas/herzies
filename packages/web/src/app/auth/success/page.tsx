export default function AuthSuccessPage() {
	return (
		<main style={{ maxWidth: 400, margin: "0 auto", padding: "4rem 2rem" }}>
			<h1 style={{ color: "#c77dff" }}>herzies</h1>
			<p style={{ color: "#4ade80" }}>You're logged in!</p>
			<p>
				Now run <code style={{ background: "#16213e", padding: "0.2rem 0.5rem", borderRadius: 4 }}>herzies login</code> in
				your terminal to sync your Herzie.
			</p>
		</main>
	);
}
