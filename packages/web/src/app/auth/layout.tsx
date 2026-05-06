import type { Metadata } from "next";

export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<style>{`
				body > nav, body > footer { display: none !important; }
			`}</style>
			<div
				style={{
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{children}
			</div>
		</>
	);
}
