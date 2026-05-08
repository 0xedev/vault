"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import { X_ACCOUNTS } from "@/lib/data";
import { fmtCompact, appColor } from "@/lib/utils";

function Stat({ lab, v, good }: { lab: string; v: string; good?: boolean }) {
  return (
    <div className="col" style={{ gap: 1 }}>
      <span className="meta">{lab}</span>
      <span className="amt mono" style={{ color: good ? "var(--accent)" : undefined, fontSize: 14 }}>{v}</span>
    </div>
  );
}

function Bar({ label, pct, sub }: { label: string; pct: number; sub: string }) {
  return (
    <div>
      <div className="row between" style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 4 }}>
        <span>{label}</span><span>{sub}</span>
      </div>
      <div className="bar"><i style={{ width: pct + "%", background: "var(--accent)" }}/></div>
    </div>
  );
}

export default function XAccountsPage() {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("followers");

  const filt = useMemo(() => {
    let r = X_ACCOUNTS;
    if (filter === "verified") r = r.filter(a => a.verified);
    if (filter === "small")    r = r.filter(a => a.followers < 25000);
    if (filter === "mid")      r = r.filter(a => a.followers >= 25000 && a.followers < 100000);
    if (filter === "large")    r = r.filter(a => a.followers >= 100000);
    if (sort === "followers") r = [...r].sort((a, b) => b.followers - a.followers);
    if (sort === "engage")    r = [...r].sort((a, b) => b.engagement - a.engagement);
    if (sort === "price")     r = [...r].sort((a, b) => a.price - b.price);
    return r;
  }, [filter, sort]);

  const chips: [string, string, number][] = [
    ["all",      "All",       X_ACCOUNTS.length],
    ["verified", "Verified",  X_ACCOUNTS.filter(a => a.verified).length],
    ["small",    "<25k",      X_ACCOUNTS.filter(a => a.followers < 25000).length],
    ["mid",      "25k-100k",  X_ACCOUNTS.filter(a => a.followers >= 25000 && a.followers < 100000).length],
    ["large",    "100k+",     X_ACCOUNTS.filter(a => a.followers >= 100000).length],
  ];

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "center", marginBottom: 22, gap: 24, rowGap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div className="eyebrow">X Account Marketplace</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Buy or sell <em style={{ fontFamily: "var(--display)", fontStyle: "italic" }}>X handles</em> with verified history.
          </h1>
        </div>
        <div className="row" style={{ gap: 18, alignItems: "center" }}>
          <div className="col right" style={{ gap: 1 }}>
            <span className="smallcaps">Open listings</span>
            <span className="mono" style={{ fontSize: 14 }}>{X_ACCOUNTS.length}</span>
          </div>
          <div className="col right" style={{ gap: 1 }}>
            <span className="smallcaps">In escrow</span>
            <span className="mono" style={{ fontSize: 14 }}>68.0 Ξ</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 18 }}>
        <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 6 }}>
            <Icon.filter style={{ color: "var(--ink-4)" }} />
            <span className="smallcaps" style={{ marginRight: 8 }}>Filter</span>
          </div>
          <div className="chips">
            {chips.map(([k, t, n]) => (
              <button key={k} className={"chip" + (filter === k ? " active" : "")} onClick={() => setFilter(k)}>
                {t} <span className="count">{n}</span>
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div className="row" style={{ gap: 6 }}>
            <span className="smallcaps">Sort</span>
            <div className="seg">
              {[["followers", "Followers ↓"], ["engage", "Engagement"], ["price", "Price ↑"]].map(([k, t]) => (
                <button key={k} className={sort === k ? "active" : ""} onClick={() => setSort(k)}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-3">
        {filt.map(a => (
          <Link href="/deals" key={a.id} className="x-card">
            <div className="x-head">
              <div className="x-avatar">{a.handle.slice(1, 3).toUpperCase()}</div>
              <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }} className="trunc">{a.handle}</span>
                  {a.verified && <span style={{ color: "var(--accent)" }}><Icon.check style={{ width: 13, height: 13 }}/></span>}
                </div>
                <span className="muted-2" style={{ fontSize: 11.5 }}>{a.niche} · {a.age} old</span>
              </div>
              <Icon.xlogo style={{ color: "var(--ink-4)" }}/>
            </div>
            <div className="x-stats">
              <Stat lab="Followers" v={fmtCompact(a.followers)} />
              <Stat lab="Engage" v={a.engagement + "%"} />
              <Stat lab="30d growth" v={a.growth} good={a.growth.startsWith("+")} />
            </div>
            <Bar label="Activity" pct={Math.min(100, a.posts_30d)} sub={`${a.posts_30d} posts / 30d`} />
            <div className="row between" style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 4 }}>
              <span className="meta">{a.id}</span>
              <span className="mono" style={{ fontSize: 16 }}>{a.price} <span style={{ color: "var(--ink-3)", fontSize: 12 }}>Ξ</span></span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
