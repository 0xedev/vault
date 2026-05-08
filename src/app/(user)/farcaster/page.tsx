"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import { FARCASTER } from "@/lib/data";
import { fmtCompact, appColor } from "@/lib/utils";

export default function FarcasterPage() {
  const [sort, setSort] = useState("followers");
  const [filter, setFilter] = useState("all");

  const filt = useMemo(() => {
    let r = FARCASTER;
    if (filter === "power") r = r.filter(a => a.power_badge);
    if (filter === "verified") r = r.filter(a => a.verified);
    if (sort === "followers") r = [...r].sort((a, b) => b.followers - a.followers);
    if (sort === "rev")       r = [...r].sort((a, b) => b.rev_30d - a.rev_30d);
    if (sort === "price")     r = [...r].sort((a, b) => a.price - b.price);
    return r;
  }, [filter, sort]);

  const chips: [string, string, number][] = [
    ["all",      "All FIDs",     FARCASTER.length],
    ["power",    "Power badge",  FARCASTER.filter(a => a.power_badge).length],
    ["verified", "Verified",     FARCASTER.filter(a => a.verified).length],
  ];

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "center", marginBottom: 22, gap: 24, rowGap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div className="eyebrow">Farcaster FID Marketplace</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Transfer <em style={{ fontFamily: "var(--display)", fontStyle: "italic" }}>Farcaster FIDs</em> on-chain in one transaction.
          </h1>
        </div>
        <div className="row" style={{ gap: 18, alignItems: "center" }}>
          <div className="col right" style={{ gap: 1 }}>
            <span className="smallcaps">Open listings</span>
            <span className="mono" style={{ fontSize: 14 }}>{FARCASTER.length}</span>
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
              {[["followers", "Followers ↓"], ["rev", "Channel rev ↓"], ["price", "Price ↑"]].map(([k, t]) => (
                <button key={k} className={sort === k ? "active" : ""} onClick={() => setSort(k)}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>FID</th><th>Handle</th><th>Channel</th>
              <th className="right">Followers</th><th className="right">Casts / 30d</th>
              <th className="right">Channel rev</th><th>Status</th><th className="right">Price</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filt.map(a => (
              <tr key={a.id} style={{ cursor: "pointer" }}>
                <td className="mono" style={{ color: "var(--ink)" }}>
                  <Link href="/deals" style={{ color: "inherit", textDecoration: "none" }}>#{a.fid}</Link>
                </td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <div className="x-avatar" style={{ width: 26, height: 26, fontSize: 11, background: `linear-gradient(135deg, ${appColor(a.handle, 0)}, ${appColor(a.handle, 1)})`, color: "#fff" }}>{a.handle.slice(0, 2).toUpperCase()}</div>
                    <span style={{ fontSize: 13 }}>@{a.handle}</span>
                  </div>
                </td>
                <td className="muted">/{a.channel}</td>
                <td className="right mono">{fmtCompact(a.followers)}</td>
                <td className="right mono">{a.casts_30d}</td>
                <td className="right mono">{a.rev_30d > 0 ? `${a.rev_30d} Ξ` : <span className="muted-2">—</span>}</td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    {a.power_badge && <span className="pill" style={{ background: "color-mix(in oklab, var(--gold) 14%, transparent)", color: "var(--gold)", borderColor: "color-mix(in oklab, var(--gold) 30%, transparent)" }}><span className="pdot" style={{ background: "var(--gold)" }}/>Power</span>}
                    {a.verified && <span className="pill funded"><span className="pdot"/>Verified</span>}
                  </div>
                </td>
                <td className="right mono" style={{ color: "var(--ink)" }}>{a.price} Ξ</td>
                <td className="right"><Icon.arrow style={{ color: "var(--ink-3)" }}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-3" style={{ marginTop: 18 }}>
        <div className="metric"><span className="lab">Avg sale price</span><span className="val">{(FARCASTER.reduce((a, b) => a + b.price, 0) / FARCASTER.length).toFixed(1)} Ξ</span><span className="delta">last 30 days</span></div>
        <div className="metric"><span className="lab">FIDs transferred</span><span className="val">142</span><span className="delta">+ 18 vs prior month</span></div>
        <div className="metric"><span className="lab">Median followers sold</span><span className="val">{fmtCompact(12400)}</span><span className="delta">3.4 follows / cast</span></div>
      </div>
    </main>
  );
}
