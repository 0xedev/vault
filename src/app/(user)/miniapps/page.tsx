"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import { appColor, fmtCompact } from "@/lib/utils";
import { useWallet } from "@/components/WalletProvider";
import type { MiniApp } from "@/lib/data";

function ListMiniAppModal({ onClose }: { onClose: () => void }) {
  const { address } = useWallet();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState("");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [dau, setDau] = useState("");
  const [mrr, setMrr] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const handleSubmit = async () => {
    if (!address) return;
    setSubmitting(true);
    setError("");
    try {
      const stack = repo.includes("github") ? ["GitHub", "Source available"] : ["Source pending"];
      const includes = deliverables.split(",").map((item) => item.trim()).filter(Boolean);
      const res = await fetch("/api/marketplace/mini-apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress: address,
          title: name,
          description,
          price: Number(price),
          data: {
            name,
            kind: "Mini App",
            dau: Number(dau || 0),
            mrr: Number(mrr || 0),
            stack,
            source: Boolean(repo),
            verified: false,
            age: "New",
            url,
            repo,
            includes,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to submit listing");
      setDone("Listing submitted for moderation. It will appear after approval.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-h">
          <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>List Mini App</h3>
          <button className="btn ghost sm" onClick={onClose}><Icon.x /></button>
        </div>
        <div className="modal-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="label">Project Name</span>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. On-Chain Poker" />
          </div>

          <div className="grid grid-3" style={{ gap: 12 }}>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">DAU</span>
              <input className="input mono" value={dau} onChange={e => setDau(e.target.value)} placeholder="1.2k" />
            </div>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">MRR (Ξ)</span>
              <input className="input mono" value={mrr} onChange={e => setMrr(e.target.value)} placeholder="0.5" />
            </div>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">Price (Ξ)</span>
              <input className="input mono" value={price} onChange={e => setPrice(e.target.value)} placeholder="12" />
            </div>
          </div>

          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">Live URL</span>
              <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">Repository</span>
              <input className="input" value={repo} onChange={e => setRepo(e.target.value)} placeholder="GitHub URL" />
            </div>
          </div>

          <div className="col" style={{ gap: 4 }}>
            <span className="label">Project Description</span>
            <textarea
              className="input"
              style={{ minHeight: 70, resize: "vertical", padding: "10px 12px" }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this app do?"
            />
          </div>

          <div className="col" style={{ gap: 4 }}>
            <span className="label">Deliverables</span>
            <textarea
              className="input"
              style={{ minHeight: 50, resize: "vertical", padding: "10px 12px" }}
              value={deliverables}
              onChange={e => setDeliverables(e.target.value)}
              placeholder="Repo access, domain, admin roles..."
            />
          </div>

          <div className="warn-banner">
            <Icon.warn />
            <div style={{ fontSize: 11 }}>Listings enter moderation before buyers can see them. Platform fee of 2.5% applies only on successful escrow release.</div>
          </div>
          {error && <div className="warn-banner" style={{ color: "var(--risk)" }}>{error}</div>}
          {done && <div className="pill funded" style={{ width: "fit-content" }}><span className="pdot" />{done}</div>}
        </div>
        <div className="modal-f">
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn primary lg" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting || !name || !price || !repo}>
            {submitting ? "Listing..." : "List Mini App"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MiniAppsPage() {
  const { isConnected, connect } = useWallet();
  const [showListModal, setShowListModal] = useState(false);
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("dau");

  useEffect(() => {
    fetch("/api/marketplace/mini-apps")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load mini apps");
        return json;
      }).then((j) => { setApps(j.data || []); setLoading(false); })
      .catch((err) => { setError(err instanceof Error ? err.message : "Unable to load mini apps"); setLoading(false); });
  }, []);

  const kinds = ["all", ...new Set(apps.map(a => a.kind))];
  const filt = useMemo(() => {
    let r = apps;
    if (filter !== "all") r = r.filter(a => a.kind === filter);
    if (sort === "dau") r = [...r].sort((a, b) => b.dau - a.dau);
    if (sort === "mrr") r = [...r].sort((a, b) => b.mrr - a.mrr);
    if (sort === "price") r = [...r].sort((a, b) => a.price - b.price);
    return r;
  }, [apps, filter, sort]);

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "center", marginBottom: 22, gap: 24, rowGap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div className="eyebrow">Mini App Marketplace</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Acquire shipped <em style={{ fontFamily: "var(--display)", fontStyle: "italic" }}>Mini Apps</em> and on-chain projects.
          </h1>
        </div>
        <div className="row" style={{ gap: 18, alignItems: "center", flex: "0 0 auto", flexWrap: "wrap" }}>
          <div className="col right" style={{ gap: 1 }}><span className="smallcaps">Open listings</span><span className="mono" style={{ fontSize: 14 }}>{apps.length}</span></div>
          <div className="col right" style={{ gap: 1 }}><span className="smallcaps">Verified</span><span className="mono" style={{ fontSize: 14 }}>{apps.filter((app) => app.verified).length}</span></div>
          <button className="btn primary" onClick={() => isConnected ? setShowListModal(true) : connect()}>
            {isConnected ? "List Mini App" : "Connect to list"}
          </button>
        </div>
      </div>

      {showListModal && <ListMiniAppModal onClose={() => setShowListModal(false)} />}

      <div className="card" style={{ padding: 12, marginBottom: 18 }}>
        <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 6 }}><Icon.filter style={{ color: "var(--ink-4)" }} /><span className="smallcaps" style={{ marginRight: 8 }}>Filter</span></div>
          <div className="chips">
            {kinds.map(k => (
              <button key={k} className={"chip" + (filter === k ? " active" : "")} onClick={() => setFilter(k)}>
                {k === "all" ? "All" : k} <span className="count">{k === "all" ? apps.length : apps.filter(a => a.kind === k).length}</span>
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div className="row" style={{ gap: 6 }}><span className="smallcaps">Sort</span>
            <div className="seg">
              {[["dau", "DAU ↓"], ["mrr", "MRR ↓"], ["price", "Price ↑"]].map(([k, t]) => (
                <button key={k} className={sort === k ? "active" : ""} onClick={() => setSort(k)}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? <div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading…</div> : error ? <div className="warn-banner" style={{ padding: 18 }}>{error}</div> : (
        <div className="grid grid-3">
          {filt.map(a => (
            <Link href="/deals" key={a.id} className="loan-card">
              <div style={{ position: "relative", aspectRatio: "16/10", background: `linear-gradient(135deg, ${appColor(a.id, 0)}, ${appColor(a.id, 1)})`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <div style={{ fontFamily: "var(--display)", fontSize: 36, color: "#fff", letterSpacing: -0.5, textShadow: "0 2px 12px rgba(0,0,0,.3)" }}>{a.name}</div>
                <span className="pill" style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.45)", borderColor: "transparent" }}><span className="pdot" style={{ background: a.verified ? "var(--gold)" : "var(--ink-4)" }}/>{a.kind}</span>
                {a.verified && <span className="pill gold" style={{ position: "absolute", top: 10, right: 10 }}><Icon.check style={{ width: 11, height: 11 }}/> Verified</span>}
              </div>
              <div className="row between"><span className="nm trunc">{a.name}</span><span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{a.id}</span></div>
              <div className="row between">
                <div className="col" style={{ gap: 1 }}><span className="meta">DAU</span><span className="amt mono" style={{ fontSize: 14 }}>{fmtCompact(a.dau)}</span></div>
                <div className="col" style={{ gap: 1 }}><span className="meta">MRR</span><span className="amt mono" style={{ fontSize: 14 }}>{a.mrr} Ξ</span></div>
                <div className="col" style={{ gap: 1 }}><span className="meta">Age</span><span className="amt mono" style={{ fontSize: 14 }}>{a.age}</span></div>
              </div>
              <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{a.stack.map(s => <span key={s} className="chip" style={{ pointerEvents: "none", padding: "2px 7px", fontSize: 10.5 }}>{s}</span>)}</div>
              <div className="row between" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}><span className="meta">Asking</span><span className="mono" style={{ fontSize: 16 }}>{a.price} <span style={{ color: "var(--ink-3)", fontSize: 12 }}>Ξ</span></span></div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
