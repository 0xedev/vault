"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VaultMark from "@/components/VaultMark";
import Icon from "@/components/icons";
import NFTArt from "@/components/NFTArt";
import StatusPill from "@/components/StatusPill";
import LoanCard from "@/components/LoanCard";
import { useRole } from "@/components/RoleProvider";
import { useWallet } from "@/components/WalletProvider";

import { COLLECTIONS } from "@/lib/data";
import { fmtETH, fmtCompact, appColor } from "@/lib/utils";
import type { Loan, MiniApp, XAccount, FarcasterAccount } from "@/lib/data";


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
  const [miniApps, setMiniApps] = useState<MiniApp[]>([]);
  const [xAccounts, setXAccounts] = useState<XAccount[]>([]);
  const [farcaster, setFarcaster] = useState<FarcasterAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { role, setRole } = useRole();
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
    ]).then((results) => {
      if (results[0].status === "fulfilled") setLoans(results[0].value);
      if (results[1].status === "fulfilled") setMiniApps(results[1].value);
      if (results[2].status === "fulfilled") setXAccounts(results[2].value);
      if (results[3].status === "fulfilled") setFarcaster(results[3].value);
      setLoading(false);
    });
  }, []);

  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.amt, 0);
  const totalListings = loans.length + miniApps.length + xAccounts.length + farcaster.length;
  const activeLoans = loans.filter((l) => l.status === "funded").length;
  const topLoan = loans[0];
  const topMiniApp = miniApps[0];
  const topXAccount = xAccounts[0];
  const topFarcaster = farcaster[0];

  const primaryAction = role === "seller"
    ? { href: "/market", label: "List asset", sub: "NFT collateral or digital property" }
    : { href: "/market", label: "Browse deals", sub: "Loans, apps, handles, and FIDs" };

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

        {/* ── NFT Loans showcase ── */}
        <section style={{ padding: "48px 0 0" }}>
          <div className="row between" style={{ marginBottom: 24 }}>
            <div>
              <div className="eyebrow">NFT-backed loans</div>
              <h2 className="h2" style={{ margin: "6px 0 0" }}>Lend against blue-chip collateral.</h2>
            </div>
            <Link href="/market" className="btn ghost">View all <Icon.arrow /></Link>
          </div>
          {loans.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: "center" }}>
              <div style={{ width: 80, height: 80, borderRadius: 10, margin: "0 auto", overflow: "hidden", opacity: 0.6 }}>
                <NFTArt seed={420} />
              </div>
              <p className="muted" style={{ marginTop: 14, fontSize: 14 }}>No loan listings yet. Be the first.</p>
              <Link href="/market" className="btn primary sm" style={{ marginTop: 12 }}>List your NFT</Link>
            </div>
          ) : (
            <div className="grid grid-4">
              {loans.map((l) => <LoanCard key={l.id} l={l} />)}
            </div>
          )}
        </section>

        {/* ── Mini Apps showcase ── */}
        <section style={{ padding: "48px 0 0" }}>
          <div className="row between" style={{ marginBottom: 24 }}>
            <div>
              <div className="eyebrow">Mini App marketplace</div>
              <h2 className="h2" style={{ margin: "6px 0 0" }}>Acquire shipped products with revenue.</h2>
            </div>
            <Link href="/miniapps" className="btn ghost">View all <Icon.arrow /></Link>
          </div>
          {miniApps.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 12, margin: "0 auto", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </div>
              <p className="muted" style={{ marginTop: 14, fontSize: 14 }}>No mini apps yet. List your first project.</p>
              <Link href="/miniapps" className="btn primary sm" style={{ marginTop: 12 }}>List Mini App</Link>
            </div>
          ) : (
            <div className="grid grid-4">
              {miniApps.slice(0, 4).map((a) => (
                <Link href="/miniapps" key={a.id} className="loan-card">
                  <div style={{ position: "relative", aspectRatio: "16/10", background: `linear-gradient(135deg, ${appColor(a.id, 0)}, ${appColor(a.id, 1)})`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {a.imageUrl ? (
                      <img src={a.imageUrl} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div style={{ fontFamily: "var(--display)", fontSize: 28, color: "#fff", letterSpacing: -0.5, textShadow: "0 2px 12px rgba(0,0,0,.3)", padding: "0 12px", textAlign: "center" }}>{a.name}</div>
                    )}
                    <span className="pill" style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.45)", borderColor: "transparent" }}><span className="pdot"/>{a.kind}</span>
                  </div>
                  <div className="row between"><span className="nm trunc">{a.name}</span><span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{a.id}</span></div>
                  <div className="row between">
                    <div className="col" style={{ gap: 1 }}><span className="meta">DAU</span><span className="amt mono" style={{ fontSize: 14 }}>{fmtCompact(a.dau)}</span></div>
                    <div className="col" style={{ gap: 1 }}><span className="meta">MRR</span><span className="amt mono" style={{ fontSize: 14 }}>{a.mrr} Ξ</span></div>
                    <div className="col" style={{ gap: 1 }}><span className="meta">Price</span><span className="amt mono" style={{ fontSize: 14 }}>{a.price} Ξ</span></div>
                  </div>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                    {a.stack.slice(0, 3).map((s) => <span key={s} className="chip" style={{ pointerEvents: "none", padding: "2px 7px", fontSize: 10.5 }}>{s}</span>)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── X Accounts showcase ── */}
        <section style={{ padding: "48px 0 0" }}>
          <div className="row between" style={{ marginBottom: 24 }}>
            <div>
              <div className="eyebrow">X Account marketplace</div>
              <h2 className="h2" style={{ margin: "6px 0 0" }}>Buy & sell handles with verified history.</h2>
            </div>
            <Link href="/x" className="btn ghost">View all <Icon.arrow /></Link>
          </div>
          {xAccounts.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: "center" }}>
              <Icon.xlogo style={{ width: 36, height: 36, color: "var(--ink-4)", margin: "0 auto" }} />
              <p className="muted" style={{ marginTop: 14, fontSize: 14 }}>No X accounts listed yet. List yours.</p>
              <Link href="/x" className="btn primary sm" style={{ marginTop: 12 }}>List X account</Link>
            </div>
          ) : (
            <div className="grid grid-4">
              {xAccounts.slice(0, 4).map((a) => (
                <Link href="/x" key={a.id} className="loan-card">
                  <div className="x-head" style={{ border: 0, padding: "14px 16px" }}>
                    <div className="x-avatar" style={{ width: 40, height: 40, fontSize: 14 }}>
                      {a.imageUrl ? (
                        <img src={a.imageUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        a.handle.slice(1, 3).toUpperCase()
                      )}
                    </div>
                    <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                      <div className="row" style={{ gap: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }} className="trunc">{a.handle}</span>
                        {a.verified && <Icon.check style={{ width: 12, height: 12, color: "var(--accent)" }} />}
                      </div>
                      <span className="muted-2" style={{ fontSize: 11 }}>{a.niche}</span>
                    </div>
                    <Icon.xlogo style={{ width: 16, height: 16, color: "var(--ink-4)" }} />
                  </div>
                  <div className="row between" style={{ padding: "0 2px" }}>
                    <div className="col" style={{ gap: 1 }}><span className="meta">Followers</span><span className="amt mono" style={{ fontSize: 14 }}>{fmtCompact(a.followers)}</span></div>
                    <div className="col" style={{ gap: 1 }}><span className="meta">Engage</span><span className="amt mono" style={{ fontSize: 14 }}>{a.engagement}%</span></div>
                    <div className="col" style={{ gap: 1 }}><span className="meta">Price</span><span className="amt mono" style={{ fontSize: 14 }}>{a.price} Ξ</span></div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Farcaster showcase ── */}
        <section style={{ padding: "48px 0 0" }}>
          <div className="row between" style={{ marginBottom: 24 }}>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <img src="/farcaster.png" alt="Farcaster" style={{ width: 32, height: 16 }} />
              <div>
                <div className="eyebrow">Farcaster FID marketplace</div>
                <h2 className="h2" style={{ margin: "6px 0 0" }}>Transfer FIDs on-chain in one transaction.</h2>
              </div>
            </div>
            <Link href="/farcaster" className="btn ghost">View all <Icon.arrow /></Link>
          </div>
          {farcaster.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: "center" }}>
              <img src="/farcaster.png" alt="Farcaster" style={{ width: 48, height: 48, margin: "0 auto", display: "block" }} />
              <p className="muted" style={{ marginTop: 14, fontSize: 14 }}>No FIDs listed yet. List yours on-chain.</p>
              <Link href="/farcaster" className="btn primary sm" style={{ marginTop: 12 }}>List FID</Link>
            </div>
          ) : (
            <div className="grid grid-4">
              {farcaster.slice(0, 4).map((a) => (
                <Link href="/farcaster" key={a.id} className="loan-card">
                  <div className="x-head" style={{ border: 0, padding: "14px 16px", background: "linear-gradient(135deg, rgba(138,99,210,0.1), rgba(166,126,229,0.06))" }}>
                    <div className="x-avatar" style={{ width: 40, height: 40, fontSize: 14, background: a.imageUrl ? "transparent" : "linear-gradient(135deg, #8A63D2, #a67ee5)", color: "#fff" }}>
                      {a.imageUrl ? (
                        <img src={a.imageUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        a.handle.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                      <div className="row" style={{ gap: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }} className="trunc">@{a.handle}</span>
                        {a.power_badge && <span className="pill" style={{ padding: "1px 6px", fontSize: 9, background: "color-mix(in oklab, var(--gold) 14%, transparent)", color: "var(--gold)" }}>Power</span>}
                      </div>
                      <span className="muted-2" style={{ fontSize: 11 }}>/{a.channel}</span>
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: "var(--ink-4)", fontWeight: 500 }}>#{a.fid}</span>
                  </div>
                  <div className="row between" style={{ padding: "0 2px" }}>
                    <div className="col" style={{ gap: 1 }}><span className="meta">Followers</span><span className="amt mono" style={{ fontSize: 14 }}>{fmtCompact(a.followers)}</span></div>
                    <div className="col" style={{ gap: 1 }}><span className="meta">Casts/30d</span><span className="amt mono" style={{ fontSize: 14 }}>{a.casts_30d}</span></div>
                    <div className="col" style={{ gap: 1 }}><span className="meta">Price</span><span className="amt mono" style={{ fontSize: 14 }}>{a.price} Ξ</span></div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Trust model ── */}
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
      <div className="show-mobile mobile-home">
        <section className="mobile-hero-panel">
          <div className="mobile-kicker-row">
            <div className="mobile-kicker">
              <span className="live-dot" />
              <span>{loading ? "Syncing markets" : "Live escrow market"}</span>
            </div>
            {!isConnected && (
              <button className="mobile-connect-nudge" onClick={connect} disabled={isConnecting}>
                {isConnecting ? "Connecting…" : "Connect →"}
              </button>
            )}
          </div>

          <div className="mobile-hero-stats">
            <div className="mobile-hero-stat">
              <strong>{totalListings}</strong>
              <span>Listings</span>
            </div>
            <div className="mobile-hero-stat">
              <strong>{fmtETH(totalPrincipal)} Ξ</strong>
              <span>NFT principal</span>
            </div>
            <div className="mobile-hero-stat">
              <strong>{activeLoans}</strong>
              <span>Active loans</span>
            </div>
          </div>

          <h1>Berkshire Hathaway<br />of <em>on-chain</em> assets.</h1>

          <div className="mobile-role-switch" aria-label="Homepage role">
            <button className={role === "buyer" ? "active" : ""} onClick={() => setRole("buyer")}>Buy / lend</button>
            <button className={role === "seller" ? "active" : ""} onClick={() => setRole("seller")}>Sell / borrow</button>
          </div>

          <Link
            href={primaryAction.href}
            className="btn primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
          >
            {primaryAction.label} <Icon.arrow />
          </Link>
        </section>

        <div className="mobile-market-intro">
          <div>
            <span className="eyebrow">Markets</span>
            <h2>Choose where to deploy capital.</h2>
          </div>
          <span>{totalListings} opportunities</span>
        </div>

        <div className="mobile-market-cards">
          <Link href="/market" className="mobile-mkt-card">
            <div className="mobile-mkt-cover" style={{ background: "linear-gradient(135deg, #2C3E8C, #4A6CF7)" }}>
              <div className="mobile-mkt-cover-content">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden" }}><NFTArt seed={4200} /></div>
                  <span className="mobile-mkt-name">NFT Loans</span>
                </div>
                <span className="mobile-mkt-count">{loans.length} live</span>
              </div>
            </div>
            {topLoan ? (
              <div className="mobile-mkt-preview">
                <div style={{ width: 36, height: 36, borderRadius: 7, overflow: "hidden", flexShrink: 0 }}><NFTArt seed={topLoan.coll} /></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{COLLECTIONS[topLoan.coll]} {topLoan.token}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{fmtETH(topLoan.amt)} Ξ · {topLoan.apr}% APR</span>
                </div>
                <span className="mobile-mkt-price">{topLoan.term}d</span>
              </div>
            ) : (
              <div className="mobile-mkt-empty">No NFT loans yet - <strong>be first</strong></div>
            )}
            <div className="mobile-mkt-viewall">View all NFT loans -&gt;</div>
          </Link>

          <Link href="/miniapps" className="mobile-mkt-card">
            <div className="mobile-mkt-cover" style={{ background: "linear-gradient(135deg, #C2410C, #F97316)" }}>
              <div className="mobile-mkt-cover-content">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--display)", fontSize: 16, color: "#fff" }}>M</div>
                  <span className="mobile-mkt-name">Mini Apps</span>
                </div>
                <span className="mobile-mkt-count">{miniApps.length} listed</span>
              </div>
            </div>
            {topMiniApp ? (
              <div className="mobile-mkt-preview">
                <div style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, background: `linear-gradient(135deg, ${appColor(topMiniApp.id, 0)}, ${appColor(topMiniApp.id, 1)})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--display)", fontSize: 16, color: "#fff" }}>{topMiniApp.name.slice(0, 1)}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topMiniApp.name}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{fmtCompact(topMiniApp.dau)} DAU · {topMiniApp.mrr} Ξ MRR</span>
                </div>
                <span className="mobile-mkt-price">{topMiniApp.price} Ξ</span>
              </div>
            ) : (
              <div className="mobile-mkt-empty">No mini apps yet - <strong>be first</strong></div>
            )}
            <div className="mobile-mkt-viewall">View all mini apps -&gt;</div>
          </Link>

          <Link href="/x" className="mobile-mkt-card">
            <div className="mobile-mkt-cover" style={{ background: "linear-gradient(135deg, #18181B, #3F3F46)" }}>
              <div className="mobile-mkt-cover-content">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon.xlogo style={{ width: 18, height: 18 }} /></div>
                  <span className="mobile-mkt-name">X Accounts</span>
                </div>
                <span className="mobile-mkt-count">{xAccounts.length} handles</span>
              </div>
            </div>
            {topXAccount ? (
              <div className="mobile-mkt-preview">
                <div className="x-avatar" style={{ width: 36, height: 36, fontSize: 13, flexShrink: 0 }}>
                  {topXAccount.imageUrl ? (
                    <img src={topXAccount.imageUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : topXAccount.handle.slice(1, 3).toUpperCase()}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topXAccount.handle}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{fmtCompact(topXAccount.followers)} followers</span>
                </div>
                <span className="mobile-mkt-price">{topXAccount.price} Ξ</span>
              </div>
            ) : (
              <div className="mobile-mkt-empty">No X accounts yet - <strong>be first</strong></div>
            )}
            <div className="mobile-mkt-viewall">View all X accounts -&gt;</div>
          </Link>

          <Link href="/farcaster" className="mobile-mkt-card">
            <div className="mobile-mkt-cover" style={{ background: "linear-gradient(135deg, #6D28D9, #A67EE5)" }}>
              <div className="mobile-mkt-cover-content">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon.cast style={{ width: 18, height: 18 }} /></div>
                  <span className="mobile-mkt-name">Farcaster</span>
                </div>
                <span className="mobile-mkt-count">{farcaster.length} FIDs</span>
              </div>
            </div>
            {topFarcaster ? (
              <div className="mobile-mkt-preview">
                <div className="x-avatar" style={{ width: 36, height: 36, fontSize: 13, flexShrink: 0, background: "linear-gradient(135deg, #6D28D9, #A67EE5)", color: "#fff" }}>
                  {topFarcaster.imageUrl ? (
                    <img src={topFarcaster.imageUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : topFarcaster.handle.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    @{topFarcaster.handle} <span className="mono" style={{ fontSize: 11, opacity: 0.6 }}>#{topFarcaster.fid}</span>
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{fmtCompact(topFarcaster.followers)} followers</span>
                </div>
                <span className="mobile-mkt-price">{topFarcaster.price} Ξ</span>
              </div>
            ) : (
              <div className="mobile-mkt-empty">No FIDs listed yet - <strong>be first</strong></div>
            )}
            <div className="mobile-mkt-viewall">View all Farcaster FIDs -&gt;</div>
          </Link>
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
