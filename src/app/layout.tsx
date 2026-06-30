import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument-serif" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: "Baseshire Hethaway — Crypto Conglomerate",
  description: "Liquidity for illiquid digital assets. NFT-backed lending, mini-app sales, X handle transfers, and Farcaster FID escrow.",
  metadataBase: new URL("https://baseshirehethaway.com"),
  openGraph: {
    title: "Baseshire Hethaway — Crypto Conglomerate",
    description: "Liquidity for illiquid digital assets. NFT-backed lending, mini-app sales, X handle transfers, and Farcaster FID escrow.",
    siteName: "Baseshire Hethaway",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Baseshire Hethaway — Crypto Conglomerate",
    description: "Liquidity for illiquid digital assets. NFT-backed lending, mini-app sales, X handle transfers, and Farcaster FID escrow.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="fc:miniapp" content={JSON.stringify({
          version: "1",
          imageUrl: "https://baseshirehethaway.com/logo.png",
          button: {
            title: "Browse marketplace",
            action: {
              type: "launch_frame",
              name: "Baseshire Hethaway",
              url: "https://baseshirehethaway.com",
              splashImageUrl: "https://baseshirehethaway.com/logo.png",
              splashBackgroundColor: "#0052ff",
            },
          },
        })} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Baseshire Hethaway",
              "description": "Liquidity for illiquid digital assets. NFT-backed lending, mini-app sales, X handle transfers, and Farcaster FID escrow.",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
              },
            }),
          }}
        />
      </head>
      <body className={`${geist.variable} ${instrumentSerif.variable} ${jetBrainsMono.variable}`} data-theme="light" data-card="solid" data-density="regular">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
