import { createServerClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SpotifyCard } from "./SpotifyCard";

export const metadata: Metadata = {
	title: "Dashboard",
	robots: { index: false, follow: false },
};

export default async function DashboardPage() {
	const supabase = await createServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const admin = createAdminClient();
	const { data: connection } = await admin
		.from("spotify_connections")
		.select("display_name, spotify_user_id")
		.eq("user_id", user.id)
		.maybeSingle();

	return (
		<main
			style={{
				maxWidth: 800,
				margin: "0 auto",
				padding: "2rem 1.5rem",
			}}
		>
			<h1 style={{ fontSize: 18, color: "var(--purple)", marginBottom: "1.5rem" }}>
				dashboard
			</h1>

			<SpotifyCard connection={connection} />

			<form action="/auth/logout" method="POST" style={{ marginTop: "2rem" }}>
				<button
					type="submit"
					style={{
						background: "none",
						border: "none",
						color: "var(--text-dim)",
						fontFamily: "inherit",
						fontSize: 12,
						cursor: "pointer",
						padding: 0,
					}}
				>
					sign out
				</button>
			</form>
		</main>
	);
}
