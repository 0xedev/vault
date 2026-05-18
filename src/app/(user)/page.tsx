"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VaultMark from "@/components/VaultMark";
import Icon from "@/components/icons";
import NFTArt from "@/components/NFTArt";
import StatusPill from "@/components/StatusPill";
import LoanCard from "@/components/LoanCard";

import { COLLECTIONS } from "@/lib/data";
import { fmtETH } from "@/lib/utils";
import type { Loan } from "@/lib/data";


function Sparkline() {
  const pts = [12, 18, 14, 22, 28, 26, 32, 30, 38, 42, 40, 48, 52, 58, 56, 64, 70, 68, 74, 80, 84];
  const max = Math.max(...pts), min = Math.min(...pts);
  const w = 100, h = 28;
  const path = pts.map((v, i) => {
    const x = i / (pts.length - 1) * w;
    const y = h - (v - min) / (max - min) * h;
    return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: 12, border: "1px solid var(--line)" }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="64" preserveAspectRatio="none">
        <defs>
          <linearGradient id="spk" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ACC2DC" stopOpacity="0.3" />
            <stop offset="1" stopColor="#ACC2DC" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${w},${h} L 0,${h} Z`} fill="url(#spk)" />
        <path d={path} stroke="#ACC2DC" strokeWidth="0.6" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function DashboardPreview({ loans }: { loans: Loan[] }) {
  const activePrincipal = loans.reduce((sum, loan) => sum + loan.amt, 0);
  return (
    <div className="card" style={{ padding: 18, position: "relative", overflow: "hidden" }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <div className="row" style={{ gap: 10 }}>
          <span className="pill funded"><span className="pdot" />LIVE</span>
          <span className="smallcaps">Dashboard · Apr 30</span>
        </div>
        <div className="seg">
          <button className="active">7d</button><button>30d</button><button>All</button>
        </div>
      </div>
      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <div className="metric"><span className="lab">Open listings</span><span className="val">{loans.length}</span></div>
        <div className="metric"><span className="lab">Active principal</span><span className="val">{fmtETH(activePrincipal)} Ξ</span></div>
      </div>
      <Sparkline />
      <div className="col" style={{ gap: 10, marginTop: 12 }}>
        {loans.slice(0, 3).map((l, i) => (
          <div key={l.id} className="row between" style={{ padding: "8px 0", borderTop: i ? "1px dashed var(--line)" : "none" }}>
            <div className="row" style={{ gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}><NFTArt seed={l.coll} /></div>
              <div className="col" style={{ gap: 1 }}>
                <span style={{ fontSize: 13 }}>{COLLECTIONS[l.coll]} <span className="muted-2">{l.token}</span></span>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{l.id} · {l.term}d · {l.apr}% APR</span>
              </div>
            </div>
            <div className="col right" style={{ gap: 1 }}>
              <span className="mono" style={{ fontSize: 13 }}>{fmtETH(l.amt)} Ξ</span>
              <StatusPill s={l.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/listings?limit=4")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load live listings");
        return json;
      })
      .then((json) => setLoans(json.data || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load live listings"))
      .finally(() => setLoading(false));
  }, []);

  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.amt, 0);

  return (
    <main className="main">
      {/* DESKTOP */}
      <div className="hide-mobile">
        <section className="hero">
          <div>
            <div className="eyebrow">Lending · Escrow · BSH</div>
            <h1 className="h1" style={{ marginTop: 24 }}>
              Liquidity for <em>illiquid</em> digital assets.
            </h1>
            <p className="lede" style={{ margin: "28px 0 32px" }}>
              One venue for NFT-backed loans, mini-app sales, X handles, and Farcaster FIDs — all settled through audited escrow.
            </p>
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <Link href="/market" className="btn primary lg">Lend & borrow <Icon.arrow /></Link>
              <Link href="/market" className="btn lg ghost">List your NFT</Link>
            </div>
            <div className="row" style={{ marginTop: 56, gap: 48, flexWrap: "wrap" }}>
              {[["Listed principal", `${fmtETH(totalPrincipal)} Ξ`], ["Active loans", String(loans.length)]].map(([k, v]) => (
                <div key={k} className="col" style={{ gap: 4 }}>
                  <span className="smallcaps">{k}</span>
                  <span className="mono" style={{ fontSize: 18 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="col" style={{ gap: 20 }}>
            <DashboardPreview loans={loans} />
          </div>
        </section>

        <section style={{ padding: "96px 0 48px" }}>
          <div style={{ marginBottom: 56, maxWidth: "42ch" }}>
            <div className="eyebrow">Three marketplaces, one settlement layer</div>
            <h2 className="h2" style={{ marginTop: 12, fontSize: 38 }}>Built for high-value, contested transactions.</h2>
          </div>
          <div className="grid grid-4" style={{ gap: 1, background: "var(--line)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            {[
              { n: "01", t: "NFT-backed loans",   d: "Lend & borrow against your NFTs. Set your own terms, counter-offer, lock in escrow.", k: "/market" },
              { n: "02", t: "Mini Apps",          d: "Buy & sell shipped Frame v2 apps, on-chain projects, and full-bundle takeovers.", k: "/miniapps" },
              { n: "03", t: "X Accounts",         d: "Buy & sell X handles with verified follower history. OAuth pre-checks, 2FA handover.", k: "/x" },
              { n: "04", t: "Farcaster FIDs",     d: "Buy & sell FIDs on-chain. One signed tx. Channel ownership transfers cleanly.", k: "/farcaster" },
            ].map((x) => (
              <Link key={x.t} href={x.k} style={{ padding: 28, background: "var(--bg)", border: 0, color: "inherit", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 0 }}>
                <span className="mono muted-2" style={{ fontSize: 11, letterSpacing: "0.1em" }}>{x.n}</span>
                <h3 className="serif" style={{ fontSize: 22, margin: "16px 0 10px" }}>{x.t}</h3>
                <p className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 0, marginBottom: 18, maxWidth: "32ch", flex: 1 }}>{x.d}</p>
                <span className="row" style={{ gap: 6, color: "var(--accent)", fontSize: 12.5 }}>Browse <Icon.arrow/></span>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ padding: "32px 0 24px" }}>
          <div className="eyebrow">Live on BSH</div>
          <h2 className="h2" style={{ margin: "8px 0 22px" }}>Lend & borrow against trending NFTs.</h2>
          {loading ? (
            <div className="muted" style={{ padding: 48, textAlign: "center" }}>Loading live listings…</div>
          ) : error ? (
            <div className="warn-banner" style={{ padding: 18 }}>{error}</div>
          ) : loans.length === 0 ? (
            <div className="muted" style={{ padding: 48, textAlign: "center" }}>No live NFT loan listings yet.</div>
          ) : (
            <div className="grid grid-4">
              {loans.map((l) => <LoanCard key={l.id} l={l} />)}
            </div>
          )}
        </section>

        <section style={{ padding: "48px 0 12px" }}>
          <div className="card" style={{ padding: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
            <div>
              <div className="eyebrow">Trust model</div>
              <h3 className="h2" style={{ margin: "8px 0 12px", fontSize: 26 }}>Risky moves are visually loud — by design.</h3>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, maxWidth: "50ch" }}>
                We surface platform fees before signing, flash deadline countdowns when default is imminent, and gate liquidation behind a confirm-by-typing pattern.
              </p>
            </div>
            <div className="warn-banner" style={{ alignItems: "flex-start", padding: 16 }}>
              <Icon.warn style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 500 }}>Default in 5h 42m</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>Hollow Forms #3301 will be transferred to the lender if 4.21 Ξ isn&apos;t repaid by 22:00 UTC.</div>
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
      <div className="show-mobile" style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 12 }}>
        <div>
          <h1 className="h1" style={{ marginTop: 0 }}>
            The Berkshire Hathaway<br />of <em>on-chain</em> assets.
          </h1>
          <p className="lede">
            Lend & borrow against NFTs. Buy & sell mini-apps, X handles, and Farcaster FIDs.
          </p>
          <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            <Link href="/market" className="btn primary lg">Lend & borrow <Icon.arrow /></Link>
            <Link href="/miniapps" className="btn lg ghost">Buy & sell <Icon.arrow /></Link>
          </div>
          <div className="row" style={{ marginTop: 32, gap: 32, flexWrap: "wrap" }}>
            {[[`${fmtETH(totalPrincipal)} Ξ`, "Listed"], [String(loans.length), "Active loans"]].map(([v, k]) => (
              <div key={k} className="col" style={{ gap: 2 }}>
                <span className="mono" style={{ fontSize: 20 }}>{v}</span>
                <span className="smallcaps">{k}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-2" style={{ gap: 10 }}>
          {[
            { t: "NFT Loans", d: "Lend & borrow against NFTs", k: "/market" },
            { t: "Mini Apps", d: "Buy & sell shipped apps", k: "/miniapps" },
            { t: "X Accounts", d: "Buy & sell X handles", k: "/x" },
            { t: "Farcaster", d: "Buy & sell FIDs on-chain", k: "/farcaster" },
          ].map((x) => (
            <Link key={x.t} href={x.k} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              <h3 className="serif" style={{ fontSize: 17, margin: 0 }}>{x.t}</h3>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>{x.d}</p>
              <span className="row" style={{ gap: 4, color: "var(--accent)", fontSize: 11 }}>Browse <Icon.arrow /></span>
            </Link>
          ))}
        </div>
      </div>

      <footer className="row between" style={{ padding: "48px 0 0", color: "var(--ink-4)", fontSize: 12 }}>
        <div className="row" style={{ gap: 8 }}><VaultMark size={16} /> <span className="mono">baseshire.fi · v0.5.0</span></div>
        <div className="row" style={{ gap: 18 }}>
          <a className="lnk" href="#">Docs</a><a className="lnk" href="#">Risk</a><a className="lnk" href="#">Discord</a>
        </div>
      </footer>
    </main>
  );
}
