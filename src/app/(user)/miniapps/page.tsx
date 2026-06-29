/* eslint-disable @next/next/no-img-element */
"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/icons";
import { appColor, fmtCompact } from "@/lib/utils";
import { useWallet } from "@/components/WalletProvider";
import { getEscrowAddress, getPublicClient, writeFundDeal, writeListDeal, waitForDealId, hashMetadata, parseContractError, writeApproveUsdc } from "@/lib/contract";
import { parseUnits, type Address } from "viem";
import type { MiniApp } from "@/lib/data";

const DELIVERABLE_OPTIONS = [
  { key: "source", label: "Source code repo" },
  { key: "domain", label: "Domain & DNS" },
  { key: "social", label: "Social handles (X / Farcaster / TG)" },
  { key: "contract", label: "Smart contract owner role" },
  { key: "keys", label: "API keys & env vars" },
  { key: "db", label: "Database / hosting" },
  { key: "docs", label: "Documentation & onboarding" },
  { key: "revenue", label: "Revenue streams (tx fees, subs)" },
] as const;

function ListMiniAppModal({ onClose }: { onClose: () => void }) {
  const { address } = useWallet();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState("");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState<Record<string, boolean>>({});
  const [dau, setDau] = useState("");
  const [mrr, setMrr] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fetchingOg, setFetchingOg] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const toggleDeliverable = (key: string) => {
    setDeliverables((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchOgPreview = async (liveUrl: string) => {
    if (!liveUrl || !/^https?:\/\//i.test(liveUrl)) return;
    setFetchingOg(true);
    try {
      const res = await fetch(`/api/og-preview?url=${encodeURIComponent(liveUrl)}`);
      const json = await res.json();
      if (json.image) {
        setImageUrl(json.image);
        if (json.title && !name) setName(json.title);
        if (json.description && !description) setDescription(json.description);
      }
    } catch {
      // silent — user can set image manually
    } finally {
      setFetchingOg(false);
    }
  };

  const handleUrlBlur = () => {
    if (url) fetchOgPreview(url);
  };

  const handleSubmit = async () => {
    if (!address) return;
    setSubmitting(true);
    setError("");
    try {
      const selectedDeliverables = DELIVERABLE_OPTIONS
        .filter((d) => deliverables[d.key])
        .map((d) => d.label);

      // 1. Build metadata, hash it, store on-chain
      const metadata = {
        name,
        description,
        url,
        repo,
        image: imageUrl,
        deliverables: selectedDeliverables,
        dau: Number(dau || 0),
        mrr: Number(mrr || 0),
        price: Number(price),
        stack: repo.includes("github") ? ["GitHub", "Source available"] : ["Source pending"],
        createdAt: new Date().toISOString(),
      };
      const metaHash = hashMetadata(metadata);
      const priceWei = parseUnits(price || "0", 6);

      // 2. Store on-chain
      const txHash = await writeListDeal(address as Address, priceWei, metaHash);
      const contractListingId = await waitForDealId(txHash);

      // 3. POST to API
      const res = await fetch("/api/marketplace/mini-apps", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress: address,
          title: name,
          description,
          price: Number(price),
          chainId: 8453,
          contractAddress: getEscrowAddress(),
          contractListingId,
          txHash,
          data: {
            name,
            kind: "Mini App",
            dau: Number(dau || 0),
            mrr: Number(mrr || 0),
            imageUrl,
            stack: metadata.stack,
            source: Boolean(repo),
            age: "New",
            url,
            repo,
            includes: selectedDeliverables,
            metadataHash: metaHash,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to submit listing");
      setDone("Listed on-chain. Buyers can fund escrow and confirm terms directly with the seller.");
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-h">
          <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>List Mini App</h3>
          <button className="btn ghost sm" onClick={onClose}><Icon.x /></button>
        </div>
        <div className="modal-b" style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "70vh", overflowY: "auto" }}>
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
              <input className="input" value={url} onChange={e => setUrl(e.target.value)} onBlur={handleUrlBlur} placeholder="https://..." />
            </div>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">Repository</span>
              <input className="input" value={repo} onChange={e => setRepo(e.target.value)} placeholder="GitHub URL" />
            </div>
          </div>

          {/* OG image preview */}
          <div className="col" style={{ gap: 6 }}>
            <span className="label">Preview image {fetchingOg && <span className="muted" style={{ fontWeight: 400 }}>fetching…</span>}</span>
            <div className="row" style={{ gap: 10 }}>
              <input
                className="input"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="Image URL (auto-fetched from OG, or paste manually)"
                style={{ flex: 1 }}
              />
              <button className="btn sm" onClick={() => fetchOgPreview(url)} disabled={fetchingOg || !url} style={{ flexShrink: 0 }}>
                {fetchingOg ? "…" : "Re-fetch"}
              </button>
            </div>
            {imageUrl && (
              <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: 8, overflow: "hidden", background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                <img
                  src={imageUrl}
                  alt="Preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>

          <div className="col" style={{ gap: 4 }}>
            <span className="label">Project Description</span>
            <textarea
              className="input"
              style={{ minHeight: 60, resize: "vertical", padding: "10px 12px" }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this app do?"
            />
          </div>

          {/* Deliverables checklist grid */}
          <div className="col" style={{ gap: 6 }}>
            <span className="label">Deliverables ({Object.values(deliverables).filter(Boolean).length} selected)</span>
            <div className="grid grid-2" style={{ gap: 6 }}>
              {DELIVERABLE_OPTIONS.map((d) => (
                <label
                  key={d.key}
                  className="check"
                  style={{
                    padding: "8px 10px",
                    border: deliverables[d.key] ? "1px solid var(--accent)" : "1px solid var(--line)",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: deliverables[d.key] ? "rgba(127,157,197,0.08)" : "transparent",
                    fontSize: 12.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!deliverables[d.key]}
                    onChange={() => toggleDeliverable(d.key)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <div className="warn-banner">
            <Icon.warn />
            <div style={{ fontSize: 11 }}>
              Listing is stored on-chain. Buyers and sellers negotiate deliverables in escrow.
            </div>
          </div>
          {error && <div className="warn-banner" style={{ color: "var(--risk)" }}>{error}</div>}
          {done && (
            <div className="card" style={{ padding: 14, background: "rgba(127,157,197,0.08)", border: "1px solid var(--line)" }}>
              <div className="pill funded" style={{ width: "fit-content", marginBottom: 10 }}><span className="pdot" />{done}</div>
            </div>
          )}
        </div>
        <div className="modal-f">
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn primary lg" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting || !name || !price || !url}>
            {submitting ? "Signing & listing…" : "List Mini App"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MiniAppsPage() {
  const router = useRouter();
  const { isConnected, connect, address } = useWallet();
  const [showListModal, setShowListModal] = useState(false);
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState("");
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

  const fundEscrow = async (app: MiniApp) => {
    if (!isConnected || !address) {
      await connect();
      return;
    }
    setBuying(app.id);
    setError("");
    try {
      if (!app.sellerAddress) throw new Error("Listing seller is missing.");
      if (app.sellerAddress.toLowerCase() === address.toLowerCase()) throw new Error("You cannot buy your own listing.");
      if (!app.contractListingId) throw new Error("Listing is pending chain sync. Try again after the listing transaction is confirmed.");
      const amtWei = parseUnits(String(app.price), 6);
      const approveHash = await writeApproveUsdc(address as Address, getEscrowAddress(), amtWei);
      await getPublicClient().waitForTransactionReceipt({ hash: approveHash });
      const txHash = await writeFundDeal(address as Address, BigInt(app.contractListingId), amtWei);
      const res = await fetch("/api/escrows", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: app.id,
          buyerAddress: address,
          sellerAddress: app.sellerAddress,
          amount: app.price,
          currency: "USDC",
          chainId: app.chainId || 8453,
          contractAddress: app.contractAddress || getEscrowAddress(),
          contractListingId: app.contractListingId,
          txHash,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to create escrow");
      router.push("/deals");
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setBuying("");
    }
  };

  return (
    <main id="main-content" role="main" aria-label="Main content" className="main">
      <div className="row between" style={{ alignItems: "center", marginBottom: 22, gap: 24, rowGap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div className="eyebrow">Mini App Marketplace</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Acquire shipped <em style={{ fontFamily: "var(--display)", fontStyle: "italic" }}>Mini Apps</em> and on-chain projects.
          </h1>
        </div>
        <div className="row" style={{ gap: 18, alignItems: "center", flex: "0 0 auto", flexWrap: "wrap" }}>
          <div className="col right" style={{ gap: 1 }}><span className="smallcaps">Open listings</span><span className="mono" style={{ fontSize: 14 }}>{apps.length}</span></div>
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
            <article key={a.id} className="loan-card">
              <div style={{ position: "relative", aspectRatio: "16/10", background: `linear-gradient(135deg, ${appColor(a.id, 0)}, ${appColor(a.id, 1)})`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {a.imageUrl ? (
                  <img src={a.imageUrl} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div style={{ fontFamily: "var(--display)", fontSize: 36, color: "#fff", letterSpacing: -0.5, textShadow: "0 2px 12px rgba(0,0,0,.3)" }}>{a.name}</div>
                )}
                <span className="pill" style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.45)", borderColor: "transparent" }}><span className="pdot" />{a.kind}</span>
              </div>
              <div className="row between"><span className="nm trunc">{a.name}</span><span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{a.id}</span></div>
              <div className="row between">
                <div className="col" style={{ gap: 1 }}><span className="meta">DAU</span><span className="amt mono" style={{ fontSize: 14 }}>{fmtCompact(a.dau)}</span></div>
                <div className="col" style={{ gap: 1 }}><span className="meta">MRR</span><span className="amt mono" style={{ fontSize: 14 }}>{a.mrr} Ξ</span></div>
                <div className="col" style={{ gap: 1 }}><span className="meta">Age</span><span className="amt mono" style={{ fontSize: 14 }}>{a.age}</span></div>
              </div>
              <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{a.stack.map(s => <span key={s} className="chip" style={{ pointerEvents: "none", padding: "2px 7px", fontSize: 10.5 }}>{s}</span>)}</div>
              <div className="row between" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <span className="meta">Asking</span>
                <span className="mono" style={{ fontSize: 16 }}>{a.price} <span style={{ color: "var(--ink-3)", fontSize: 12 }}>Ξ</span></span>
              </div>
              <button className="btn primary" onClick={() => fundEscrow(a)} disabled={buying === a.id || a.sellerAddress?.toLowerCase() === address?.toLowerCase()} style={{ width: "100%", justifyContent: "center" }}>
                {buying === a.id ? "Funding escrow..." : a.sellerAddress?.toLowerCase() === address?.toLowerCase() ? "Your listing" : "Buy with escrow"}
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
