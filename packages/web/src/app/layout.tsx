import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase-server";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.herzies.app"),
  title: {
    default: "Herzies — Your digital pet that grows by listening to music",
    template: "%s | Herzies",
  },
  description:
    "Hatch your herzie, play music, and watch it evolve. A terminal-based digital pet powered by your listening habits. Works with Apple Music and Spotify on macOS.",
  keywords: [
    "cli",
    "digital pet",
    "music",
    "terminal",
    "macos",
    "apple music",
    "spotify",
  ],
  openGraph: {
    title: "Herzies",
    description: "Your digital pet that grows by listening to music.",
    siteName: "Herzies",
    type: "website",
    url: "https://www.herzies.app",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Herzies — your digital pet that grows by listening to music",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Herzies",
    description: "Your digital pet that grows by listening to music.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <html lang="en">
      <body>
        <nav className="max-w-[800px] mx-auto pt-6 px-6 flex flex-wrap justify-between items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-3">
            <a href="/" className="text-base font-bold text-purple no-underline">
              herzies
              <span className="text-[10px] font-medium opacity-60 ml-1">
                [closed beta]
              </span>
            </a>
          </div>
          <div className="flex gap-4 items-center">
            <a href="/leaderboard" className="text-[13px] text-yellow">
              leaderboard
            </a>
            <a href="/docs" className="text-[13px] text-cyan">
              docs
            </a>
            <a href="/about" className="text-[13px] text-text-dim">
              about
            </a>
            {user && (
              <a href="/dashboard" className="text-[13px] text-green">
                dashboard
              </a>
            )}
          </div>
        </nav>

        {children}
        <footer className="max-w-[800px] mx-auto mt-auto pt-12 px-6 pb-6 flex justify-between items-center text-xs text-text-dim">
          <span>&copy; {new Date().getFullYear()} Herzies</span>
          <div className="flex gap-4 items-center">
            <a href="/terms" className="text-xs text-text-dim">
              terms of service
            </a>
            <a
              href="https://github.com/Herzies/herzies"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="var(--color-text-dim)"
                aria-label="GitHub"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
