"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import Icon from "@/components/icons";

export default function InfoPage() {
  return (
    <main id="main-content" role="main" aria-label="Main content" className="main">
      <div className="col" style={{ maxWidth: 720, margin: "0 auto", gap: 32, padding: "40px 16px" }}>
        <div>
          <div className="eyebrow">About</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Baseshire Hethaway — Crypto Conglomerate.</h1>
          <p className="muted" style={{ marginTop: 10, fontSize: 14, lineHeight: 1.7 }}>
            Liquidity for illiquid digital assets. We operate NFT-backed lending, mini-app escrow sales,
            X handle transfers, Farcaster FID escrow, and Clanker token rights trading — all on Base.
          </p>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>How it works</div>
          <div className="col" style={{ gap: 20 }}>
            {[
              {
                icon: <Icon.shield />,
                step: "1. List your asset",
                detail: "Connect your wallet, select the asset type, and set your price and terms. Clanker tokens are checked automatically; other asset handoffs are confirmed by the buyer in escrow.",
              },
              {
                icon: <Icon.escrow />,
                step: "2. Get funded or sold",
                detail: "Lenders fund NFT loans. Buyers purchase mini apps, X handles, Farcaster FIDs, or Clanker rights. Funds are held in escrow until delivery is confirmed.",
              },
              {
                icon: <Icon.check />,
                step: "3. Deliver & release",
                detail: "Sellers provide proof of delivery. Buyers confirm receipt. Funds are released from escrow. Disputes are resolved by admin with on-chain settlement.",
              },
            ].map((item, i) => (
              <div key={i} className="row" style={{ gap: 14, alignItems: "flex-start" }}>
                <span style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", borderRadius: 10, flexShrink: 0, color: "var(--accent)" }}>
                  {item.icon}
                </span>
                <div className="col" style={{ gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{item.step}</span>
                  <span className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{item.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
          {[
            { label: "NFT Loans", desc: "Borrow against your NFTs with ETH. Lenders earn yield.", href: "/market" },
            { label: "Mini Apps", desc: "Buy and sell web apps with escrow protection.", href: "/miniapps" },
            { label: "X Accounts", desc: "Transfer X handles with buyer-confirmed escrow.", href: "/x" },
            { label: "Farcaster FIDs", desc: "Escrow FID custody transfers on Optimism.", href: "/farcaster" },
            { label: "Clanker Tokens", desc: "Trade token rights, vault claims, and admin.", href: "/clanker" },
            { label: "Bundles", desc: "Package multiple assets into a single deal.", href: "/market?tab=bundles" },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="card" style={{ padding: 16, textDecoration: "none", color: "inherit" }}>
              <div className="col" style={{ gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>
                <span className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{item.desc}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Fees & settlement</div>
          <div className="col" style={{ gap: 14 }}>
            <div className="kv"><span className="k">Platform fee</span><span className="v">1.5% of deal principal</span></div>
            <div className="kv"><span className="k">Escrow currency</span><span className="v">USDC on Base</span></div>
            <div className="kv"><span className="k">NFT loan APR</span><span className="v">Market-determined, typically 10–25%</span></div>
            <div className="kv"><span className="k">Deal terms</span><span className="v">Flexible — set by seller</span></div>
            <div className="kv"><span className="k">Disputes</span><span className="v">Admin-mediated with on-chain resolution</span></div>
          </div>
        </div>

        <div className="row" style={{ gap: 10, justifyContent: "center" }}>
          <Link href="/market" className="btn primary">Browse marketplace</Link>
          <Link href="/deals" className="btn">View your profile</Link>
        </div>
      </div>
    </main>
  );
}
