import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google";
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
  title: "Baseshire Hathaway — Crypto Conglomerate",
  description: "Liquidity for illiquid digital assets. NFT-backed lending, mini-app sales, X handle transfers, and Farcaster FID escrow.",
  metadataBase: new URL("https://baseshirehathaway.com"),
  openGraph: {
    title: "Baseshire Hathaway — Crypto Conglomerate",
    description: "Liquidity for illiquid digital assets. NFT-backed lending, mini-app sales, X handle transfers, and Farcaster FID escrow.",
    siteName: "Baseshire Hathaway",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Baseshire Hathaway — Crypto Conglomerate",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Baseshire Hathaway",
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
        {children}
      </body>
    </html>
  );
}
