import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Herzies",
	description: "A CLI pet that grows by listening to music",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body style={{ fontFamily: "monospace", background: "#1a1a2e", color: "#e0e0e0", margin: 0 }}>
				{children}
			</body>
		</html>
	);
}
