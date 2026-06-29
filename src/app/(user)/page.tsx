"use client";
/* eslint-disable @next/next/no-img-element */

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import Link from "next/link";
import Image from "next/image";
import VaultMark from "@/components/VaultMark";
import Icon from "@/components/icons";
import NFTArt from "@/components/NFTArt";
import StatusPill from "@/components/StatusPill";
import { useWallet } from "@/components/WalletProvider";
import { COLLECTIONS } from "@/lib/data";
import { fmtETH, fmtCompact, appColor } from "@/lib/utils";
import type {
  Loan,
  MiniApp,
  XAccount,
  FarcasterAccount,
  ClankerToken,
} from "@/lib/data";

type MobileOpportunity = {
  href: string;
  market: string;
  title: string;
  meta: string;
  value: string;
  color: string;
  icon: ReactElement;
};

const feedFilters = [
  { value: "All", label: "All Markets" },
  { value: "Loans", label: "NFT Loans" },
  { value: "Mini Apps", label: "Apps & Websites" },
  { value: "Social", label: "Social Identity" },
];

function Sparkline() {
  const pts = [
    12, 18, 14, 22, 28, 26, 32, 30, 38, 42, 40, 48, 52, 58, 56, 64, 70, 68, 74,
    80, 84,
  ];
  const max = Math.max(...pts),
    min = Math.min(...pts);
  const w = 100,
    h = 28;
  const path = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((v - min) / (max - min)) * h;
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: 8,
        padding: 12,
        border: "1px solid var(--line)",
      }}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height="64"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="spk" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#0052FF" stopOpacity="0.3" />
            <stop offset="1" stopColor="#0052FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${w},${h} L 0,${h} Z`} fill="url(#spk)" />
        <path
          d={path}
          stroke="#0052FF"
          strokeWidth="0.6"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function DashboardPreview({ loans }: { loans: Loan[] }) {
  const activePrincipal = loans.reduce((sum, loan) => sum + loan.amt, 0);
  return (
    <div
      className="card"
      style={{ padding: 18, position: "relative", overflow: "hidden" }}
    >
      <div className="row between" style={{ marginBottom: 14 }}>
        <div className="row" style={{ gap: 10 }}>
          <span className="pill funded">
            <span className="pdot" />
            LIVE
          </span>
          <span className="smallcaps">Dashboard · Apr 30</span>
        </div>
        <div className="seg">
          <button className="active">7d</button>
          <button>30d</button>
          <button>All</button>
        </div>
      </div>
      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <div className="metric">
          <span className="lab">Open listings</span>
          <span className="val">{loans.length}</span>
        </div>
        <div className="metric">
          <span className="lab">Active principal</span>
          <span className="val">{fmtETH(activePrincipal)} Ξ</span>
        </div>
      </div>
      <Sparkline />
      <div className="col" style={{ gap: 10, marginTop: 12 }}>
        {loans.slice(0, 3).map((l, i) => (
          <div
            key={l.id}
            className="row between"
            style={{
              padding: "8px 0",
              borderTop: i ? "1px dashed var(--line)" : "none",
            }}
          >
            <div className="row" style={{ gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {l.imageUrl ? (
                  <img src={l.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <NFTArt seed={l.coll} />
                )}
              </div>
              <div className="col" style={{ gap: 1 }}>
                <span style={{ fontSize: 13 }}>
                  {COLLECTIONS[l.coll]}{" "}
                  <span className="muted-2">{l.token}</span>
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "var(--ink-4)" }}
                >
                  {l.id} · {l.term}d · {l.apr}% APR
                </span>
              </div>
            </div>
            <div className="col right" style={{ gap: 1 }}>
              <span className="mono" style={{ fontSize: 13 }}>
                {fmtETH(l.amt)} Ξ
              </span>
              <StatusPill s={l.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [feedFilter, setFeedFilter] = useState("All");
  const [feedFilterOpen, setFeedFilterOpen] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [miniApps, setMiniApps] = useState<MiniApp[]>([]);
  const [xAccounts, setXAccounts] = useState<XAccount[]>([]);
  const [farcaster, setFarcaster] = useState<FarcasterAccount[]>([]);
  const [clanker, setClanker] = useState<ClankerToken[]>([]);
  const [loading, setLoading] = useState(true);
  const { isConnected, isConnecting, connect } = useWallet();

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/listings?limit=4").then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        return (json.data || []) as Loan[];
      }),
      fetch("/api/marketplace/mini-apps").then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        return (json.data || []) as MiniApp[];
      }),
      fetch("/api/marketplace/x-accounts").then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        return (json.data || []) as XAccount[];
      }),
      fetch("/api/marketplace/farcaster").then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        return (json.data || []) as FarcasterAccount[];
      }),
      fetch("/api/marketplace/clanker").then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        return (json.data || []) as ClankerToken[];
      }),
    ]).then((results) => {
      if (results[0].status === "fulfilled") setLoans(results[0].value);
      if (results[1].status === "fulfilled") setMiniApps(results[1].value);
      if (results[2].status === "fulfilled") setXAccounts(results[2].value);
      if (results[3].status === "fulfilled") setFarcaster(results[3].value);
      if (results[4].status === "fulfilled") setClanker(results[4].value);
      setLoading(false);
    });
  }, []);

  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.amt, 0);
  const totalListings =
    loans.length +
    miniApps.length +
    xAccounts.length +
    farcaster.length +
    clanker.length;
  const activeLoans = loans.filter((l) => l.status === "funded").length;
  const allOpportunities = [
    ...loans.slice(0, 4).map((l) => ({
      href: "/market",
      market: "NFT loan",
      title: `${COLLECTIONS[l.coll]} ${l.token}`,
      meta: `${fmtETH(l.amt)} Ξ · ${l.apr}% APR · ${l.term}d`,
      value: `${l.ltv}% LTV`,
      color: "#4A6CF7",
      icon: l.imageUrl ? (
        <img src={l.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <NFTArt seed={l.coll} />
      ),
    })),
    ...miniApps.slice(0, 4).map((topMiniApp) => ({
      href: "/miniapps",
      market: "Mini app",
      title: topMiniApp.name,
      meta: `${fmtCompact(topMiniApp.dau)} DAU · ${topMiniApp.mrr} Ξ MRR`,
      value: `${topMiniApp.price} Ξ`,
      color: "#F97316",
      icon: (
        <span
          className="feed-image"
          style={{
            backgroundImage: topMiniApp.imageUrl
              ? `url("${topMiniApp.imageUrl}")`
              : `linear-gradient(135deg, ${appColor(topMiniApp.id, 0)}, ${appColor(topMiniApp.id, 1)})`,
          }}
        >
          {!topMiniApp.imageUrl && topMiniApp.name.slice(0, 1)}
        </span>
      ),
    })),
    ...xAccounts.slice(0, 4).map((topXAccount) => ({
      href: "/x",
      market: "X account",
      title: topXAccount.handle,
      meta: `${fmtCompact(topXAccount.followers)} followers · ${topXAccount.engagement}% engagement`,
      value: `${topXAccount.price} Ξ`,
      color: "#52525B",
      icon: (
        <span
          className={`feed-image${topXAccount.imageUrl ? "" : " feed-image-contain"}`}
          style={{
            backgroundImage: `url("${topXAccount.imageUrl || "/x.svg"}")`,
          }}
        >
          {!topXAccount.imageUrl && <Icon.xlogo />}
        </span>
      ),
    })),
    ...farcaster.slice(0, 4).map((topFarcaster) => ({
      href: "/farcaster",
      market: "Farcaster",
      title: `@${topFarcaster.handle}`,
      meta: `${fmtCompact(topFarcaster.followers)} followers · FID #${topFarcaster.fid}`,
      value: `${topFarcaster.price} Ξ`,
      color: "#8B5CF6",
      icon: (
        <span
          className="feed-image"
          style={{
            backgroundImage: `url("${topFarcaster.imageUrl || "/farcaster.png"}")`,
          }}
        >
          {!topFarcaster.imageUrl && <Icon.cast />}
        </span>
      ),
    })),
  ].filter(Boolean) as MobileOpportunity[];

  const opportunityRows = allOpportunities.filter((o) => {
    if (feedFilter === "All") return true;
    if (feedFilter === "Loans") return o.market === "NFT loan";
    if (feedFilter === "Mini Apps") return o.market === "Mini app";
    if (feedFilter === "Social")
      return o.market === "X account" || o.market === "Farcaster";
    return true;
  });
  const selectedFeedFilter =
    feedFilters.find((filter) => filter.value === feedFilter) || feedFilters[0];

  return (
    <main
      id="main-content"
      role="main"
      aria-label="Main content"
      className="main"
    >
      {/* DESKTOP */}
      <div className="hide-mobile">
        <section className="hero">
          <div>
            <div className="eyebrow">Lending · Escrow · BSH</div>
            <h1 className="h1" style={{ marginTop: 24 }}>
              The Baseshire Hethaway of <em>on-chain</em> assets.
            </h1>
            <p className="lede" style={{ margin: "28px 0 32px" }}>
              Securely buy, sell, and collateralize NFTs, Mini-Apps, and social
              handles through our marketplace.
            </p>
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <Link href="/market" className="btn primary lg">
                Explore Markets <Icon.arrow />
              </Link>
              {/* <Link href="/market" className="btn lg ghost">
                List an Asset
              </Link> */}
            </div>
            <div
              className="row"
              style={{ marginTop: 56, gap: 48, flexWrap: "wrap" }}
            >
              {[
                ["Listed principal", `${fmtETH(totalPrincipal)} Ξ`],
                ["Active loans", String(loans.length)],
              ].map(([k, v]) => (
                <div key={k} className="col" style={{ gap: 4 }}>
                  <span className="smallcaps">{k}</span>
                  <span className="mono" style={{ fontSize: 18 }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="col" style={{ gap: 20 }}>
            <DashboardPreview loans={loans} />
          </div>
        </section>

        {/* Combined marketplace carousel */}
        <section className="market-carousel-section">
          <div className="row between market-carousel-head">
            <div>
              <div className="eyebrow">All marketplaces</div>
              {/* <h2 className="h2" style={{ margin: "6px 0 0" }}>One carousel for every escrow market.</h2> */}
            </div>
            <div
              className="market-carousel-links"
              aria-label="Marketplace shortcuts"
            >
              <Link href="/market">NFT loans</Link>
              <Link href="/miniapps">Mini Apps</Link>
              <Link href="/x">X accounts</Link>
              <Link href="/farcaster">Farcaster</Link>
              <Link href="/clanker">Clanker</Link>
              <Link href="/market" className="market-carousel-cta">
                List an asset <Icon.arrow />
              </Link>
            </div>
          </div>

          <div className="market-carousel-shell">
            {allOpportunities.length === 0 ? (
              <div className="market-carousel-empty">
                <div className="market-float-visual">
                  <NFTArt seed={420} />
                </div>
                <div>
                  <strong>No live listings yet.</strong>
                  <span>
                    List the first asset on the active contract to publish it
                    here.
                  </span>
                  <Link href="/market" className="market-empty-cta">
                    Create listing <Icon.arrow />
                  </Link>
                </div>
              </div>
            ) : (
              <div
                className="market-carousel-track"
                aria-label="Marketplace listings carousel"
              >
                {allOpportunities.map((item, index) => (
                  <Link
                    key={`${item.href}-${item.title}`}
                    href={item.href}
                    className="market-float-card"
                    style={
                      {
                        "--market-color": item.color,
                        "--float-offset": `${index % 2 === 0 ? 0 : 14}px`,
                      } as CSSProperties
                    }
                  >
                    <span className="market-float-glow" />
                    <span className="market-float-top">
                      <span className="market-float-visual">{item.icon}</span>
                      <span
                        className="pill"
                        style={{
                          borderColor:
                            "color-mix(in oklab, var(--market-color) 30%, transparent)",
                          color: "var(--market-color)",
                        }}
                      >
                        <span
                          className="pdot"
                          style={{ background: "var(--market-color)" }}
                        />
                        {item.market}
                      </span>
                    </span>
                    <span className="market-float-copy">
                      <strong>{item.title}</strong>
                      <span>{item.meta}</span>
                    </span>
                    <span className="market-float-foot">
                      <span className="mono">{item.value}</span>
                      <span>
                        View <Icon.arrow />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Trust model ── */}
        <section style={{ padding: "48px 0 12px" }}>
          <div
            className="card"
            style={{
              padding: 32,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 32,
              alignItems: "center",
            }}
          >
            <div>
              <div className="eyebrow">Trust model</div>
              <h3 className="h2" style={{ margin: "8px 0 12px", fontSize: 26 }}>
                Risky moves are visually loud — by design.
              </h3>
              <p
                className="muted"
                style={{ fontSize: 14, lineHeight: 1.6, maxWidth: "50ch" }}
              >
                We surface platform fees before signing, flash deadline
                countdowns when default is imminent, and gate liquidation behind
                a confirm-by-typing pattern.
              </p>
            </div>
            <div
              className="warn-banner"
              style={{ alignItems: "flex-start", padding: 16 }}
            >
              <Icon.warn style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 500 }}>Default in 5h 42m</div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--ink-3)",
                    marginTop: 2,
                  }}
                >
                  Hollow Forms #3301 will be transferred to the lender if 4.21 Ξ
                  isn&apos;t repaid by 22:00 UTC.
                </div>
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  <button className="btn primary sm">Repay 4.21 Ξ</button>
                  <button className="btn sm ghost">Refinance</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* MOBILE */}
      <div className="show-mobile mobile-home">
        <section className="mobile-command">
          <div className="mobile-command-top">
            <span>
              <span className="live-dot" />
              {loading ? "Syncing" : "Live market"}
            </span>
            {!isConnected && (
              <button onClick={connect} disabled={isConnecting}>
                {isConnecting ? "Connecting" : "Connect"}
              </button>
            )}
          </div>

          <h1>
            The Baseshire Hethaway of <em>on-chain</em> assets.
          </h1>
          <p>
            Securely buy, sell, and collateralize NFTs, Mini-Apps, and social
            handles through our marketplace.
          </p>

          <div className="mobile-command-actions">
            <Link href="/market" className="primary">
              Explore Markets
            </Link>
            {/* <Link href="/market" className="secondary">
              List an Asset
            </Link> */}
          </div>

          <div className="mobile-command-tape">
            <div>
              <strong>{totalListings}</strong>
              <span>Listings</span>
            </div>
            <div>
              <strong>{fmtETH(totalPrincipal)} Ξ</strong>
              <span>NFT principal</span>
            </div>
            <div>
              <strong>{activeLoans}</strong>
              <span>Funded</span>
            </div>
          </div>
        </section>
        <section className="mobile-categories-section">
          <div className="mobile-feed-head" style={{ marginBottom: 12 }}>
            <div>
              <span className="eyebrow">Market place</span>
              {/* <h2>Browse categories</h2> */}
            </div>
          </div>

          <div className="mobile-categories-list">
            <Link href="/market" className="mobile-category-card">
              <div className="mobile-category-img-container">
                <Image src="/nft.png" alt="NFT Loans" fill sizes="160px" />
              </div>
              <div className="mobile-category-info">
                <h3>NFT Loans</h3>
                <span className="mobile-category-badge">
                  {loans.length} active
                </span>
                <span className="mobile-category-cta">
                  Borrow/lend <Icon.arrow />
                </span>
              </div>
            </Link>

            <Link href="/miniapps" className="mobile-category-card">
              <div className="mobile-category-img-container">
                <Image
                  src="/miniapp.png"
                  alt="Apps & Websites"
                  fill
                  sizes="160px"
                />
              </div>
              <div className="mobile-category-info">
                <h3>Apps & Websites</h3>
                <span className="mobile-category-badge">
                  {miniApps.length} active
                </span>
                <span className="mobile-category-cta">
                  Buy/sell <Icon.arrow />
                </span>
              </div>
            </Link>

            <Link href="/x" className="mobile-category-card">
              <div className="mobile-category-img-container">
                <Image src="/x.svg" alt="X Handles" fill sizes="160px" />
              </div>
              <div className="mobile-category-info">
                <h3>X Handles</h3>
                <span className="mobile-category-badge">
                  {xAccounts.length} active
                </span>
                <span className="mobile-category-cta">
                  Buy/sell <Icon.arrow />
                </span>
              </div>
            </Link>

            <Link href="/farcaster" className="mobile-category-card">
              <div className="mobile-category-img-container">
                <Image
                  src="/farcaster.png"
                  alt="Farcaster"
                  fill
                  sizes="160px"
                />
              </div>
              <div className="mobile-category-info">
                <h3>Farcaster IDs</h3>
                <span className="mobile-category-badge">
                  {farcaster.length} active
                </span>
                <span className="mobile-category-cta">
                  Buy/sell <Icon.arrow />
                </span>
              </div>
            </Link>

            <Link href="/clanker" className="mobile-category-card">
              <div className="mobile-category-img-container">
                <Image src="/logo.jpeg" alt="Clanker" fill sizes="160px" />
              </div>
              <div className="mobile-category-info">
                <h3>Clanker</h3>
                <span className="mobile-category-badge">
                  {clanker.length} active
                </span>
                <span className="mobile-category-cta">
                  Buy/sell <Icon.arrow />
                </span>
              </div>
            </Link>
          </div>
        </section>
        <section className="mobile-feed">
          <div className="mobile-feed-head" style={{ alignItems: "center" }}>
            <div>
              <span className="eyebrow">Feeds</span>
              {/* <h2>Best starting points</h2> */}
            </div>
            <div
              className="mobile-feed-filter-dropdown"
              onBlur={(event) => {
                if (
                  !event.relatedTarget ||
                  !event.currentTarget.contains(event.relatedTarget as Node)
                ) {
                  setFeedFilterOpen(false);
                }
              }}
            >
              <button
                type="button"
                className="mobile-feed-filter-trigger"
                aria-haspopup="listbox"
                aria-expanded={feedFilterOpen}
                onClick={() => setFeedFilterOpen((open) => !open)}
              >
                <span>{selectedFeedFilter.label}</span>
                <Icon.filter />
              </button>
              {feedFilterOpen && (
                <div className="mobile-feed-filter-menu" role="listbox">
                  {feedFilters.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      role="option"
                      aria-selected={feedFilter === filter.value}
                      className={feedFilter === filter.value ? "active" : ""}
                      onClick={() => {
                        setFeedFilter(filter.value);
                        setFeedFilterOpen(false);
                      }}
                    >
                      {filter.label}
                      {feedFilter === filter.value && <Icon.check />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mobile-feed-list">
            {opportunityRows.length === 0 ? (
              <div className="mobile-feed-empty">
                <strong>No live listings yet.</strong>
                <span>
                  List the first asset on the active contract to publish it
                  here.
                </span>
              </div>
            ) : (
              opportunityRows.map((item) => (
                <Link
                  key={`${item.href}-${item.title}`}
                  href={item.href}
                  className="mobile-feed-row"
                  style={{ "--feed-color": item.color } as CSSProperties}
                >
                  <span className="mobile-feed-icon">{item.icon}</span>
                  <span className="mobile-feed-copy">
                    <small>{item.market}</small>
                    <strong>{item.title}</strong>
                    <em>{item.meta}</em>
                  </span>
                  <span className="mobile-feed-value">{item.value}</span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <footer
        className="row between"
        style={{ padding: "0 0 0", color: "var(--ink-4)", fontSize: 12 }}
      >
        <div className="row" style={{ gap: 8 }}>
          <VaultMark size={16} />{" "}
        </div>
      </footer>
    </main>
  );
}
