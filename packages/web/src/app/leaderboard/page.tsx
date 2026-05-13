import type { Metadata } from "next";
import { Leaderboard } from "./Leaderboard";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Top herzies ranked by XP. See who's listened the most and evolved the furthest.",
};

export default function LeaderboardPage() {
  return (
    <main className="max-w-[800px] mx-auto px-6 py-12 flex flex-col gap-6">
      <section>
        <h1 className="text-lg text-purple mb-1">leaderboard</h1>
        <p className="text-xs text-text-dim">Ranked by exp.</p>
      </section>

      <Leaderboard />
    </main>
  );
}
