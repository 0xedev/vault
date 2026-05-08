"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import LoanCard from "@/components/LoanCard";
import { LOANS, COLLECTIONS } from "@/lib/data";

export default function MarketplacePage() {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("apr");

  const filtered = useMemo(() => {
    let r = LOANS.filter((l) => filter === "all" || l.status === filter);
    if (sort === "apr") r = [...r].sort((a, b) => b.apr - a.apr);
    if (sort === "amt") r = [...r].sort((a, b) => b.amt - a.amt);
    if (sort === "ltv") r = [...r].sort((a, b) => a.ltv - b.ltv);
    return r;
  }, [filter, sort]);

  const chipData: [string, string, number][] = [
    ["all", "All", LOANS.length],
    ["open", "Open", LOANS.filter((l) => l.status === "open").length],
    ["funded", "Funded", LOANS.filter((l) => l.status === "funded").length],
    ["warn", "At risk", LOANS.filter((l) => l.status === "warn").length],
    ["default", "Defaulted", LOANS.filter((l) => l.status === "default").length],
  ];

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div className="eyebrow">Loan Marketplace</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Lend against {LOANS.length} listed NFTs.</h1>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <Link href="/market" className="btn">List collateral</Link>
          <button className="btn primary">Connect wallet</button>
        </div>
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 18 }}>
        <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 6 }}>
            <Icon.filter style={{ color: "var(--ink-4)" }} />
            <span className="smallcaps" style={{ marginRight: 8 }}>Filter</span>
          </div>
          <div className="chips">
            {chipData.map(([k, t, n]) => (
              <button key={k} className={"chip" + (filter === k ? " active" : "")} onClick={() => setFilter(k)}>
                {t} <span className="count">{n}</span>
              </button>
            ))}
          </div>
          <div className="vsep" />
          <div className="row" style={{ gap: 8 }}>
            <span className="smallcaps">Collection</span>
            <select className="select" style={{ width: 180, height: 32 }}>
              <option>All collections</option>
              {COLLECTIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className="smallcaps">Amount</span>
            <input className="input" placeholder="0 — 100 Ξ" style={{ width: 130, height: 32 }} />
          </div>
          <div style={{ flex: 1 }} />
          <div className="row" style={{ gap: 6 }}>
            <span className="smallcaps">Sort</span>
            <div className="seg">
              {[["apr", "APR ↓"], ["amt", "Amount"], ["ltv", "LTV"]].map(([k, t]) => (
                <button key={k} className={sort === k ? "active" : ""} onClick={() => setSort(k)}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-4">
        {filtered.map((l) => <LoanCard key={l.id} l={l} />)}
      </div>

      {filtered.length === 0 && (
        <div className="muted" style={{ padding: 80, textAlign: "center" }}>No loans match this filter.</div>
      )}
    </main>
  );
}
