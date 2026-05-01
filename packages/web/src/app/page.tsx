export default function Home() {
	return (
		<main style={{ maxWidth: 600, margin: "0 auto", padding: "4rem 2rem" }}>
			<h1 style={{ color: "#c77dff" }}>herzies</h1>
			<p>A CLI pet that grows by listening to music.</p>
			<pre style={{ background: "#16213e", padding: "1rem", borderRadius: 8 }}>
				{`$ npm i -g herzies
$ herzies hatch
$ herzies register`}
			</pre>
			<p style={{ marginTop: "2rem" }}>
				<a href="/auth/cli" style={{ color: "#7ec8e3" }}>
					Sign in
				</a>
			</p>
		</main>
	);
}
