import type { Metadata } from "next";
import Link from "next/link";
import BetaLeadForm from "@/components/beta-lead-form";
import Button from "@/components/button";
import Container from "@/components/container";
import { DesktopEventsPreview } from "@/components/DesktopEventsPreview";
import { DesktopHomePreview } from "@/components/DesktopHomePreview";
import { DesktopInventoryPreview } from "@/components/DesktopInventoryPreview";
import TextAndMedia from "@/components/text-and-media";

export const metadata: Metadata = {
  title: "Herzies — Your digital pet that grows by listening to music",
  description:
    "Hatch your herzie, play music, and watch it evolve. A digital pet powered by your listening habits. Works with Apple Music and Spotify on macOS.",
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container>
        <section className="hero text-center md:min-h-[60dvh] flex flex-col justify-center">
          <h1 className="sr-only">
            Herzies — Your digital pet that grows by listening to music
          </h1>

          <pre
            className="banner text-purple leading-tight mx-auto mb-4 whitespace-pre table text-left"
            aria-hidden="true"
          >
            {BANNER}
          </pre>

          <p className="text-[13px] text-text-dim mb-2">
            Your digital pet <br /> that grows by listening to music.
          </p>

          <Link href="#beta" className="inline mt-6">
            <Button className="inline">Early access</Button>
          </Link>
        </section>
      </Container>

      <Container className="pb-8 md:pb-12">
        <TextAndMedia
          preTitle="Listen"
          title="You Herzie is unique to you"
          description="Every Herzie is different. Your herzie grows with every track you listen to. Daily streaks, and friends give bonus XP."
          media={<DesktopHomePreview />}
          position="left"
        />

        <TextAndMedia
          preTitle="Collect"
          title="Collect rare items"
          description="Every track you play has a chance to drop something. Cards, gear, oddities — equip your favorites or sell and trade them with your friends."
          media={<DesktopInventoryPreview />}
          position="right"
        />

        <TextAndMedia
          preTitle="Discover"
          title="Support emerging artists"
          description="Join secret song hunts, receive rewards, and help artists get discovered."
          media={<DesktopEventsPreview />}
          position="left"
        />
      </Container>

      <Container className="">
        <section id="beta" className="py-16 sm:py-24">
          <BetaLeadForm />
        </section>
      </Container>
    </>
  );
}
