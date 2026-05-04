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

      <div style={panel}>
        <p style={{ fontSize: 13 }}>
          Herzies is your digital pet that grows by listening to music. Hatch
          your herzie, play your favourite tracks, and watch it evolve through
          three stages. Every genre counts, friends give bonus XP, and daily
          cravings keep things interesting.
        </p>
      </div>

      <div style={{ fontSize: 13 }}>
        <a href="/terms" style={{ color: "var(--cyan)" }}>
          terms of service
        </a>
      </div>
    </main>
  );
}
