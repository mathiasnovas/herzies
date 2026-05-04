import type { Metadata } from "next";
import { createSupabaseClient } from "@/lib/supabase";
import { HerzieDetail } from "./HerzieDetail";

interface Props {
	params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { name } = await params;
	const decoded = decodeURIComponent(name);
	const title = `${decoded} — herzies`;
	const description = `View ${decoded}'s herzie profile — stats, level, and listening history.`;
	return {
		title,
		description,
		openGraph: {
			title,
			description,
			type: "profile",
			url: `https://www.herzies.app/herzie/${encodeURIComponent(decoded)}`,
		},
		twitter: {
			card: "summary",
			title,
			description,
		},
	};
}

export default async function HerziePage({ params }: Props) {
	const { name } = await params;
	const decoded = decodeURIComponent(name);

	const supabase = createSupabaseClient();
	const { data } = await supabase
		.from("herzies")
		.select("name, stage, level, xp, appearance, total_minutes_listened, genre_minutes, friend_code, friend_codes, now_playing, created_at")
		.ilike("name", decoded)
		.single();

	if (!data) {
		return (
			<main
				style={{
					maxWidth: 800,
					margin: "0 auto",
					padding: "3rem 1.5rem",
					textAlign: "center",
				}}
			>
				<p style={{ color: "var(--text-dim)", fontSize: 14 }}>
					no herzie found with that name.
				</p>
			</main>
		);
	}

	return <HerzieDetail herzie={data} />;
}
