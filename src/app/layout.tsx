import type { Metadata, Viewport } from "next";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const siteUrl = "https://baseshirehethaway.com";
const defaultMiniAppEmbed = JSON.stringify({
  version: "1",
  imageUrl: `${siteUrl}/logo.png`,
  button: {
    title: "Browse marketplace",
    action: {
      type: "launch_frame",
      name: "Baseshire Hethaway",
      url: siteUrl,
      splashImageUrl: `${siteUrl}/logo.png`,
      splashBackgroundColor: "#0052ff",
    },
  },
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: "Baseshire Hethaway — Protected Escrow Terminal",
  description: "Protected escrow marketplace for high-value on-chain assets: NFT lending, Mini App sales, social account transfers, token listings, and Farcaster FID escrow.",
  metadataBase: new URL("https://baseshirehethaway.com"),
  openGraph: {
    title: "Baseshire Hethaway — Protected Escrow Terminal",
    description: "Protected escrow marketplace for high-value on-chain assets: NFT lending, Mini App sales, social account transfers, token listings, and Farcaster FID escrow.",
    siteName: "Baseshire Hethaway",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Baseshire Hethaway — Protected Escrow Terminal",
    description: "Protected escrow marketplace for high-value on-chain assets: NFT lending, Mini App sales, social account transfers, token listings, and Farcaster FID escrow.",
  },
  other: {
    "fc:miniapp": defaultMiniAppEmbed,
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
              "name": "Baseshire Hethaway",
              "description": "Protected escrow marketplace for high-value on-chain assets: NFT lending, Mini App sales, social account transfers, token listings, and Farcaster FID escrow.",
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
      <body className="font-fallbacks" data-theme="light" data-card="solid" data-density="regular">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
