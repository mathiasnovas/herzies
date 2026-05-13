import type { Metadata } from "next";
import { CliPreview } from "./CliPreview";
import { CopyBlock } from "./docs/CopyBlock";
import { Herzie3DHero } from "./Herzie3DHero";

export const metadata: Metadata = {
  title: "Herzies — Your digital pet that grows by listening to music",
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
    "Your digital pet that grows by listening to music. Works with Apple Music and Spotify.",
  url: "https://www.herzies.app",
  installUrl: "https://www.npmjs.com/package/herzies",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function Home() {
  return (
    <main className="max-w-[800px] mx-auto px-6 py-12 flex flex-col gap-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero */}
      <section className="hero">
        <h1 className="sr-only">
          Herzies — Your digital pet that grows by listening to music
        </h1>
        <pre
          className="banner text-purple leading-tight mx-auto mb-4 whitespace-pre table"
          aria-hidden="true"
        >
          {BANNER}
        </pre>

        <p className="text-center text-[13px] text-text-dim">
          Your digital pet <br /> that grows by listening to music.
        </p>

        {/* <Herzie3DHero /> */}
      </section>

      {/* Install */}
      {/* <CopyBlock command="npm i -g herzies" /> */}

      {/* <CliPreview /> */}

      {/* <div className="text-center">
        <a href="/docs" className="text-[13px] text-cyan">
          get started →
        </a>
      </div> */}
    </main>
  );
}
