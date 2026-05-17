"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import type { FarcasterAccount } from "@/lib/data";
import { fmtCompact, appColor } from "@/lib/utils";
import { useWallet } from "@/components/WalletProvider";

function ListFidModal({ onClose }: { onClose: () => void }) {
  const { address } = useWallet();
  const [fid, setFid] = useState("");
  const [handle, setHandle] = useState("");
  const [channel, setChannel] = useState("");
  const [followers, setFollowers] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const submitListing = async () => {
    if (!address) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/marketplace/farcaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress: address,
          title: handle.startsWith("@") ? handle.slice(1) : handle,
          description: `Farcaster FID ${fid}${channel ? ` in /${channel}` : ""}`,
          price: Number(price),
          data: {
            fid: Number(fid),
            handle: handle.replace(/^@/, ""),
            channel: channel.replace(/^\//, "") || "general",
            followers: Number(followers || 0),
            casts_30d: 0,
            rev_30d: 0,
            power_badge: false,
            verified: false,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to submit FID listing");
      setDone("FID submitted for ownership review. It appears after admin approval.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit FID listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-h">
          <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>List Farcaster FID</h3>
          <button className="btn ghost sm" onClick={onClose}><Icon.x /></button>
        </div>
        <div className="modal-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">FID</span>
              <input className="input mono" value={fid} onChange={(e) => setFid(e.target.value)} placeholder="12345" />
            </div>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">Handle</span>
              <input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@founder" />
            </div>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">Primary channel</span>
              <input className="input" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="/crypto" />
            </div>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">Followers</span>
              <input className="input mono" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="25000" />
            </div>
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="label">Asking price (Ξ)</span>
            <input className="input mono" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="8.5" />
          </div>
          <div className="warn-banner">
            <Icon.warn />
            <div style={{ fontSize: 11 }}>Admin review verifies FID ownership, transfer readiness, and buyer handoff instructions before the listing goes live.</div>
          </div>
          {error && <div className="warn-banner" style={{ color: "var(--risk)" }}>{error}</div>}
          {done && <div className="pill funded" style={{ width: "fit-content" }}><span className="pdot" />{done}</div>}
        </div>
        <div className="modal-f">
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn primary lg" style={{ flex: 1 }} onClick={submitListing} disabled={submitting || !fid || !handle || !price}>
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FarcasterPage() {
  const { isConnected, connect } = useWallet();
  const [accounts, setAccounts] = useState<FarcasterAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState("followers");
  const [filter, setFilter] = useState("all");
  const [listing, setListing] = useState(false);

  useEffect(() => {
    fetch("/api/marketplace/farcaster")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load Farcaster listings");
        return json;
      }).then((j) => { setAccounts(j.data || []); setLoading(false); })
      .catch((err) => { setError(err instanceof Error ? err.message : "Unable to load Farcaster listings"); setLoading(false); });
  }, []);

  const filt = useMemo(() => {
    let r = accounts;
    if (filter === "power") r = r.filter(a => a.power_badge);
    if (filter === "verified") r = r.filter(a => a.verified);
    if (sort === "followers") r = [...r].sort((a, b) => b.followers - a.followers);
    if (sort === "rev")       r = [...r].sort((a, b) => b.rev_30d - a.rev_30d);
    if (sort === "price")     r = [...r].sort((a, b) => a.price - b.price);
    return r;
  }, [filter, sort, accounts]);

  const chips: [string, string, number][] = [
    ["all",      "All FIDs",     accounts.length],
    ["power",    "Power badge",  accounts.filter(a => a.power_badge).length],
    ["verified", "Verified",     accounts.filter(a => a.verified).length],
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
            <span className="mono" style={{ fontSize: 14 }}>{accounts.length}</span>
          </div>
          <button className="btn primary" onClick={() => isConnected ? setListing(true) : connect()}>
            {isConnected ? "List FID" : "Connect to list"}
          </button>
        </div>
      </div>
      {listing && <ListFidModal onClose={() => setListing(false)} />}

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

      {loading ? <div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading…</div> : error ? <div className="warn-banner" style={{ padding: 18 }}>{error}</div> : <>

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
        <div className="metric"><span className="lab">Avg sale price</span><span className="val">{(accounts.reduce((a, b) => a + b.price, 0) / (accounts.length || 1)).toFixed(1)} Ξ</span><span className="delta">last 30 days</span></div>
        <div className="metric"><span className="lab">Power badge</span><span className="val">{accounts.filter((account) => account.power_badge).length}</span><span className="delta">live listings</span></div>
        <div className="metric"><span className="lab">Median followers listed</span><span className="val">{fmtCompact(accounts[Math.floor(accounts.length / 2)]?.followers || 0)}</span><span className="delta">from current inventory</span></div>
      </div>
      </>}
    </main>
  );
}
