import type { Metadata } from "next";
import "./globals.css";

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
			<body>
				{children}
			</body>
		</html>
	);
}
