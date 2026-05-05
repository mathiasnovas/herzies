import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "What herzies is and how it works.",
};

export default function AboutPage() {
  const panel = {
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "1rem",
  } as const;

  return (
    <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "3rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <section>
        <h1 style={{ fontSize: 18, color: "var(--purple)", marginBottom: 4 }}>
          about
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-dim)" }}>
          // what is this thing
        </p>
      </section>

      <div style={{ ...panel, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <p style={{ fontSize: 13 }}>
          Herzies is your digital pet that grows by listening to music. Hatch
          your herzie, play your favourite tracks, and watch it evolve through
          three stages. Every genre counts, friends give bonus XP, and daily
          cravings keep things interesting.
        </p>
        <p style={{ fontSize: 13 }}>
          Collect items from limited-time events, build daily listening streaks
          for bonus multipliers, and climb the leaderboard.
        </p>
      </div>

      <section>
        <h2 style={{ fontSize: 16, color: "var(--cyan)", marginBottom: 4 }}>
          how it works
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-dim)" }}>
          // under the hood
        </p>
      </section>

      <div style={{ ...panel, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <p style={{ fontSize: 13 }}>
          The CLI detects what you're listening to and sends observations to the
          herzies game server. The server is the authority for XP, leveling,
          events, and items — the CLI never writes directly to the database.
        </p>
        <p style={{ fontSize: 13 }}>
          Without an account, everything stays local. Once you log in, your
          herzie syncs across devices and appears on the leaderboard.
        </p>
      </div>

      <div style={{ fontSize: 13, display: "flex", gap: "1rem" }}>
        <a href="/docs" style={{ color: "var(--cyan)" }}>
          docs
        </a>
        <a href="/terms" style={{ color: "var(--cyan)" }}>
          terms of service
        </a>
      </div>
    </main>
  );
}
