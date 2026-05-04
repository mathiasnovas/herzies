import type { Metadata } from "next";
import { CliPreview } from "./CliPreview";
import { CopyBlock } from "./docs/CopyBlock";

export const metadata: Metadata = {
  title: "Herzies — A CLI digital pet that grows by listening to music",
  description:
    "Hatch your herzie, play music, and watch it evolve. A terminal-based digital pet powered by your listening habits. Works with Apple Music and Spotify on macOS.",
  alternates: { canonical: "https://www.herzies.app" },
};

const BANNER = `\
 _                   _
| |                 (_)
| |__   ___ _ __ _____  ___  ___
| '_ \\ / _ \\ '__|_  / |/ _ \\/ __|
| | | |  __/ |   / /| |  __/\\__ \\
|_| |_|\\___|_|  /___|_|\\___||___/`;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Herzies",
  applicationCategory: "EntertainmentApplication",
  operatingSystem: "macOS",
  description:
    "A CLI digital pet that lives in your terminal and grows by listening to music. Works with Apple Music and Spotify.",
  url: "https://www.herzies.app",
  installUrl: "https://www.npmjs.com/package/herzies",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero */}
      <section className="hero">
        <h1 className="sr-only">Herzies — A CLI digital pet that grows by listening to music</h1>
        <pre
          className="banner"
          aria-hidden="true"
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
          A digital pet that lives in your terminal <br /> and grows by
          listening to music.
        </p>
      </section>

      {/* Install */}
      <CopyBlock command="npm i -g herzies" />

      <CliPreview />

      <div style={{ textAlign: "center" }}>
        <a href="/docs" style={{ fontSize: 13, color: "var(--cyan)" }}>
          get started →
        </a>
      </div>
    </main>
  );
}
