import { CopyBlock } from "./docs/CopyBlock";

const BANNER = `\
 _                   _
| |                 (_)
| |__   ___ _ __ _____  ___  ___
| '_ \\ / _ \\ '__|_  / |/ _ \\/ __|
| | | |  __/ |   / /| |  __/\\__ \\
|_| |_|\\___|_|  /___|_|\\___||___/`;

export default function Home() {
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
      {/* Hero */}
      <section className="hero">
        <pre
          className="banner"
          style={{
            color: "var(--purple)",
            lineHeight: 1.25,
            margin: "0 auto 1rem",
            whiteSpace: "pre",
            display: "table",
          }}
        >
          {BANNER}
        </pre>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "var(--text-dim)",
          }}
        >
          A digital pet that lives in your terminal and grows by listening to
          music.
        </p>
      </section>

      {/* Install */}
      <CopyBlock command="npm i -g herzies" />

      <div style={{ textAlign: "center" }}>
        <a href="/docs" style={{ fontSize: 13, color: "var(--cyan)" }}>
          get started →
        </a>
      </div>
    </main>
  );
}
