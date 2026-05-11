"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import NFTArt from "@/components/NFTArt";
import StatusPill from "@/components/StatusPill";
import { COLLECTIONS } from "@/lib/data";
import { fmtETH } from "@/lib/utils";
import type { Loan } from "@/lib/data";

function AcceptLoanModal({ onClose, l }: { onClose: () => void; l: Loan }) {
  const [confirm, setConfirm] = useState("");
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3 className="serif" style={{ margin: 0, fontSize: 22 }}>Fund loan · {fmtETH(l.amt)} Ξ</h3>
          <button className="btn ghost sm" onClick={onClose}><Icon.x /></button>
        </div>
        <div className="modal-b">
          <div className="warn-banner" style={{ marginBottom: 16 }}>
            <Icon.warn />
            <div>{fmtETH(l.amt)} Ξ will leave your wallet and be locked in escrow until repayment or default.</div>
          </div>
          <div className="kv"><span className="k">You send</span><span className="v big">{fmtETH(l.amt)} Ξ</span></div>
          <div className="kv"><span className="k">You receive at repayment</span><span className="v" style={{ color: "var(--accent)" }}>{(l.amt * (1 + l.apr / 100 * l.term / 365)).toFixed(3)} Ξ</span></div>
          <div className="kv"><span className="k">If borrower defaults</span><span className="v">{COLLECTIONS[l.coll]} {l.token}</span></div>
          <div className="kv"><span className="k">Term</span><span className="v">{l.term} days</span></div>
          <div className="kv"><span className="k">Platform fee</span><span className="v">{(l.amt * 0.015).toFixed(3)} Ξ (1.5%)</span></div>
          <div style={{ marginTop: 16 }}>
            <span className="label">Type &quot;FUND&quot; to confirm</span>
            <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="FUND" />
          </div>
        </div>
        <div className="modal-f">
          <span className="muted-2" style={{ fontSize: 12 }}>You can withdraw your offer until matched.</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={confirm !== "FUND"} style={{ opacity: confirm === "FUND" ? 1 : 0.5 }} onClick={onClose}>Sign & fund</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CounterOfferModal({ onClose, l }: { onClose: () => void; l: Loan }) {
  const [amt, setAmt] = useState(l.amt * 0.95);
  const [apr, setApr] = useState(l.apr);
  const [term, setTerm] = useState(l.term);
  const [exp, setExp] = useState(24);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3 className="serif" style={{ margin: 0, fontSize: 22 }}>Submit counter-offer</h3>
          <button className="btn ghost sm" onClick={onClose}><Icon.x /></button>
        </div>
        <div className="modal-b">
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>Borrower listed {fmtETH(l.amt)} Ξ at {l.apr}% / {l.term}d. Submit your terms.</p>
          <div className="grid grid-2" style={{ marginTop: 16, gap: 14 }}>
            <div><span className="label">Loan amount (Ξ)</span><input className="input" type="number" step="0.1" value={amt} onChange={(e) => setAmt(+e.target.value)} /></div>
            <div><span className="label">APR (%)</span><input className="input" type="number" step="0.1" value={apr} onChange={(e) => setApr(+e.target.value)} /></div>
            <div><span className="label">Duration (days)</span><input className="input" type="number" value={term} onChange={(e) => setTerm(+e.target.value)} /></div>
            <div><span className="label">Offer expires (hours)</span><input className="input" type="number" value={exp} onChange={(e) => setExp(+e.target.value)} /></div>
          </div>
          <hr className="hr" style={{ margin: "20px 0" }} />
          <div className="kv"><span className="k">Repayment if accepted</span><span className="v">{(amt * (1 + apr / 100 * term / 365)).toFixed(3)} Ξ</span></div>
          <div className="kv"><span className="k">Implied LTV</span><span className="v">{Math.round(amt / l.value * 100)}%</span></div>
          <div className="kv"><span className="k">Your offer expires</span><span className="v">in {exp}h</span></div>
        </div>
        <div className="modal-f">
          <span className="muted-2" style={{ fontSize: 12 }}>Funds are reserved when you sign.</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={onClose}>Submit counter</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const OFFERS = [
  { who: "0x52c1…ab09", amt: 8.4, apr: 14.2, term: 30, when: "2m ago", ours: false, status: "active" },
  { who: "0x9a4f…c12e", amt: 8.0, apr: 13.0, term: 30, when: "18m ago", ours: true, status: "countered" },
  { who: "0x52c1…ab09", amt: 8.4, apr: 15.5, term: 21, when: "32m ago", ours: false, status: "expired" },
  { who: "0x771a…d50d", amt: 7.6, apr: 16.0, term: 30, when: "1h ago", ours: false, status: "expired" },
  { who: "0x9a4f…c12e", amt: 7.5, apr: 12.0, term: 21, when: "2h ago", ours: true, status: "expired" },
];

export default function LoanDetailPage() {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("offers");
  const [modal, setModal] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/listings?limit=1")
      .then((r) => r.json())
      .then((json) => {
        setLoan(json.data?.[0] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <main className="main"><div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading…</div></main>;
  if (!loan) return <main className="main"><div className="muted" style={{ padding: 80, textAlign: "center" }}>Listing not found.</div></main>;

  const l = loan;

  return (
    <main className="main">
      <div className="row" style={{ marginBottom: 14, gap: 8, fontSize: 12, color: "var(--ink-4)" }}>
        <Link href="/market" className="btn ghost sm">← Back</Link>
        <span>Loan Marketplace</span><span>/</span><span className="mono" style={{ color: "var(--ink-2)" }}>{l.id}</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr", gap: 28 }}>
        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 18, display: "grid", gridTemplateColumns: "180px 1fr", gap: 18 }}>
            <div style={{ borderRadius: 10, overflow: "hidden" }}>
              <NFTArt seed={l.coll} label={l.token} />
            </div>
            <div className="col" style={{ gap: 6 }}>
              <div className="eyebrow">Collateral</div>
              <h2 className="h2" style={{ margin: 0 }}>{COLLECTIONS[l.coll]} <span className="mono" style={{ color: "var(--ink-3)", fontSize: 22 }}>{l.token}</span></h2>
              <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                <StatusPill s={l.status} />
                <span className="pill gold"><span className="pdot" />Verified</span>
                <span className="pill"><span className="pdot" /><span className="nowrap">Floor {fmtETH(l.value)} Ξ</span></span>
                <span className="pill"><span className="pdot" />Ethereum</span>
              </div>
              <div className="row" style={{ marginTop: 14, gap: 18 }}>
                <div className="col" style={{ gap: 1 }}><span className="smallcaps">Borrower</span><span className="mono" style={{ fontSize: 13 }}>{l.borrower}</span></div>
                <div className="col" style={{ gap: 1 }}><span className="smallcaps">Reputation</span><span className="mono" style={{ fontSize: 13 }}>4.8 · 12 loans</span></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="row" style={{ borderBottom: "1px solid var(--line)" }}>
              {[["offers", "Offer history"], ["history", "Transactions"], ["terms", "Terms"]].map(([k, t]) => (
                <button key={k} className={"side-link" + (tab === k ? " active" : "")} onClick={() => setTab(k)}
                  style={{ borderRadius: 0, border: 0, borderBottom: tab === k ? "1px solid var(--accent)" : "1px solid transparent", flex: "0 0 auto", padding: "14px 18px", margin: "-1px 0 0", color: tab === k ? "var(--ink)" : "var(--ink-3)", background: "transparent" }}>{t}</button>
              ))}
            </div>
            {tab === "offers" && (
              <div style={{ padding: "8px 18px 14px" }}>
                {OFFERS.map((o, i) => (
                  <div key={i} className="offer-row">
                    <div className="avatar">{o.who.slice(2, 4)}</div>
                    <div className="col" style={{ gap: 2 }}>
                      <span className="mono" style={{ fontSize: 13 }}>{o.who} {o.ours && <span className="pill" style={{ marginLeft: 6, color: "var(--accent)", borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)" }}><span className="pdot" style={{ background: "var(--accent)" }} />You</span>}</span>
                      <span className="muted-2" style={{ fontSize: 11 }}>{o.when}</span>
                    </div>
                    <div className="col right" style={{ gap: 1 }}>
                      <span className="mono" style={{ fontSize: 13 }}>{fmtETH(o.amt)} Ξ · {o.apr}% · {o.term}d</span>
                      <span className="muted-2" style={{ fontSize: 11, textTransform: "capitalize" }}>{o.status}</span>
                    </div>
                    <button className="btn sm" disabled={o.status !== "active"} style={{ opacity: o.status === "active" ? 1 : 0.4 }}>Match</button>
                  </div>
                ))}
              </div>
            )}
            {tab === "history" && (
              <div style={{ padding: 18 }}>
                <table className="tbl">
                  <thead><tr><th>Tx</th><th>Type</th><th>From</th><th className="right">Value</th><th className="right">When</th></tr></thead>
                  <tbody>
                    <tr><td className="mono">0xa3…01f</td><td>Listing</td><td className="mono">0x9a4f…c12e</td><td className="right mono">—</td><td className="right muted">2h ago</td></tr>
                    <tr><td className="mono">0xb2…44d</td><td>Offer</td><td className="mono">0x52c1…ab09</td><td className="right mono">8.4 Ξ</td><td className="right muted">32m ago</td></tr>
                    <tr><td className="mono">0xc9…d10</td><td>Counter</td><td className="mono">0x9a4f…c12e</td><td className="right mono">8.0 Ξ</td><td className="right muted">18m ago</td></tr>
                    <tr><td className="mono">0xe1…009</td><td>Offer</td><td className="mono">0x52c1…ab09</td><td className="right mono">8.4 Ξ</td><td className="right muted">2m ago</td></tr>
                  </tbody>
                </table>
              </div>
            )}
            {tab === "terms" && (
              <div style={{ padding: 18 }}>
                <p className="muted" style={{ marginTop: 0 }}>Standard NFT-loan terms apply. On default, the borrower&apos;s NFT is transferred to the lender wallet. Platform fee is 1.5% of the loan principal at origination.</p>
              </div>
            )}
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow">Loan terms</div>
            <div className="kv"><span className="k">Principal</span><span className="v big">{fmtETH(l.amt)} Ξ</span></div>
            <div className="kv"><span className="k">Interest ({l.apr}% APR)</span><span className="v">+ 0.098 Ξ</span></div>
            <div className="kv"><span className="k">Repayment due</span><span className="v">{(l.amt * (1 + l.apr / 100 * l.term / 365)).toFixed(3)} Ξ</span></div>
            <div className="kv"><span className="k">Term</span><span className="v">{l.term} days</span></div>
            <div className="kv"><span className="k">Loan-to-value</span><span className="v">{l.ltv}%</span></div>
            <div className="kv"><span className="k">Platform fee</span><span className="v">1.5% · {(l.amt * 0.015).toFixed(3)} Ξ</span></div>
            <div className="kv"><span className="k">Escrow</span><span className="v" style={{ color: "var(--accent)" }}>vault.eth · EOA</span></div>
            <div className="row" style={{ gap: 8, marginTop: 18 }}>
              <button className="btn primary lg" style={{ flex: 1 }} onClick={() => setModal("accept")}>Accept loan · {fmtETH(l.amt)} Ξ</button>
              <button className="btn lg" onClick={() => setModal("counter")}>Counter</button>
            </div>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Default countdown</span>
              <span className="pill warn"><span className="pdot" />{l.term} days</span>
            </div>
            <div className="display-num" style={{ fontSize: 38, color: "var(--ink)" }}>29<span className="muted-2" style={{ fontSize: 18 }}>d</span> 14<span className="muted-2" style={{ fontSize: 18 }}>h</span> 02<span className="muted-2" style={{ fontSize: 18 }}>m</span></div>
            <hr className="hr" style={{ margin: "16px 0" }} />
            <div className="tline">
              <div className="ev done"><div className="ttl">NFT locked in escrow</div><div className="sub">Apr 1, 14:22</div></div>
              <div className="ev done"><div className="ttl">Loan funded · {fmtETH(l.amt)} Ξ released to borrower</div><div className="sub">Apr 1, 14:24</div></div>
              <div className="ev now"><div className="ttl">Active — accruing interest</div><div className="sub">{l.apr}% APR · 0.098 Ξ owed</div></div>
              <div className="ev"><div className="ttl">Repayment due</div><div className="sub">Apr 30, 22:00</div></div>
            </div>
          </div>
        </div>
      </div>

      {modal === "accept" && <AcceptLoanModal onClose={() => setModal(null)} l={l} />}
      {modal === "counter" && <CounterOfferModal onClose={() => setModal(null)} l={l} />}
    </main>
  );
}
