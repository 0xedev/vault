"use client";

import React, { useState, useEffect, useMemo } from "react";
import Icon from "@/components/icons";
import LoanCard from "@/components/LoanCard";
import Dropdown from "@/components/Dropdown";
import NFTArt from "@/components/NFTArt";
import { COLLECTIONS } from "@/lib/data";
import { getNFTsForOwner } from "@/lib/alchemy";
import { useWallet } from "@/components/WalletProvider";
import type { Loan } from "@/lib/data";

type LoanWithSeller = Loan & { sellerAddress?: string };

function ListNFTModal({ onClose }: { onClose: () => void }) {
  const { address } = useWallet();
  const [step, setStep] = useState(0);
  const [collection, setCollection] = useState("Meridian Genesis");
  const [tokenId, setTokenId] = useState("");
  const [amount, setAmount] = useState("");
  const [apr, setApr] = useState("14.2");
  const [term, setTerm] = useState("30");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showDetected, setShowDetected] = useState(false);
  const [detectedNfts, setDetectedNfts] = useState<{ collection: string; tokenId: string; seed: number; value: number }[]>([]);
  const [scanning, setScanning] = useState(false);
  const [collSeed] = useState(() => Math.floor(Math.random() * 100));

  const [tooltip, setTooltip] = useState("");

  const scanOwnedNfts = async () => {
    if (!address) return;
    setScanning(true);
    setShowDetected(true);

    try {
      const nfts = await getNFTsForOwner(address, "base");
      const found = nfts
        .filter((n) => n.name || n.collection?.name)
        .slice(0, 20)
        .map((n) => ({
          collection: n.collection?.name || n.contract.name || "Unknown",
          tokenId: n.tokenId.includes("#") ? n.tokenId : `#${n.tokenId}`,
          seed: parseInt(n.tokenId) || Math.floor(Math.random() * 10000),
          value: n.floorPriceEth || 0,
        }));
      setDetectedNfts(found);
    } catch {
      setError("Could not fetch NFTs. Make sure NEXT_PUBLIC_ALCHEMY_KEY is set and your wallet is on Base.");
    }

    setScanning(false);
  };

  const canContinue = collection && tokenId;
  const canReview = canContinue && amount && Number(amount) > 0 && Number(apr) > 0 && Number(term) > 0;
  const impliedLtv = canReview ? Math.round((Number(amount) / 15) * 100) : 0;
  const platformFee = Number(amount || 0) * 0.015;

  const verifyOwnership = async () => {
    if (!address) return false;
    // NFTs were already verified by Alchemy during scan
    return detectedNfts.some(n => n.collection === collection && n.tokenId === tokenId);
  };

  const handleReview = async () => {
    setError("");
    const owns = await verifyOwnership();
    if (!owns) {
      setError("Ownership not verified. Make sure you own this NFT in the connected wallet.");
      return;
    }
    setStep(1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      // 1. Sign a message proving intent to list
      if (window.ethereum && address) {
        const message = `List ${collection} ${tokenId} as collateral for ${amount} Ξ loan at ${apr}% APR / ${term} days on Baseshire Hathaway`;
        await window.ethereum.request({
          method: "personal_sign",
          params: [message, address],
        });
      }

      // 2. POST to API
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `L-${Date.now()}`,
          seller: address || "0x0000",
          amount: Number(amount),
          apr: Number(apr),
          term: Number(term),
          collection,
          tokenId,
          ltv: impliedLtv,
        }),
      });

      if (!res.ok) throw new Error("Listing failed");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const selectNFT = (c: string, t: string, value: number) => {
    setCollection(c);
    setTokenId(t);
    setAmount(value ? (value * 0.5).toFixed(1) : "");
    setShowDetected(false);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-h">
          <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>
            {step === 0 ? "Select your NFT" : step === 1 ? "Set loan terms" : "Review & sign"}
          </h3>
          <button className="btn ghost sm" onClick={onClose}><Icon.x /></button>
        </div>
        <div className="modal-b">
          {/* STEP 0 — Select NFT */}
          {step === 0 && (
            <div className="col" style={{ gap: 14 }}>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Choose an NFT from your wallet to use as collateral for a loan.
              </p>

              <button className="btn" onClick={() => { setShowDetected(!showDetected); if (!showDetected) scanOwnedNfts(); }} style={{ width: "100%", justifyContent: "center" }} disabled={scanning}>
                {scanning ? (
                  <>Scanning your wallet…</>
                ) : (
                  <><Icon.search style={{ width: 14, height: 14 }} /> {showDetected ? "Hide detected NFTs" : "Auto-detect my NFTs"}</>
                )}
              </button>

              {showDetected && (
                <>
                {scanning ? (
                  <div className="muted" style={{ padding: 20, textAlign: "center", fontSize: 13 }}>Querying Base chain for your NFTs…</div>
                ) : detectedNfts.length === 0 ? (
                  <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 12 }}>No NFTs found in your wallet from supported collections. Make sure your wallet is connected to Base.</div>
                ) : (
                <div className="grid grid-2" style={{ gap: 8, maxHeight: 200, overflowY: "auto" }}>
                  {detectedNfts.map((n, i) => (
                    <button
                      key={i}
                      onClick={() => selectNFT(n.collection, n.tokenId, n.value)}
                      className="card"
                      style={{
                        padding: 10, display: "flex", alignItems: "center", gap: 10,
                        cursor: "pointer", border: collection === n.collection && tokenId === n.tokenId ? "1px solid var(--accent)" : undefined,
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                        <NFTArt seed={n.seed} />
                      </div>
                      <div className="col" style={{ gap: 1 }}>
                        <span style={{ fontSize: 12 }}>{n.collection}</span>
                        <span className="mono muted" style={{ fontSize: 11 }}>{n.tokenId}</span>
                      </div>
                    </button>
                  ))}
                </div>
                )}
                </>
              )}

              {error && <div className="warn-banner" style={{ fontSize: 12 }}>{error}</div>}

              <button className="btn primary lg" style={{ width: "100%" }} disabled={!canContinue} onClick={handleReview}>
                Set loan terms →
              </button>
            </div>
          )}

          {/* STEP 1 — Set terms */}
          {step === 1 && (
            <div className="col" style={{ gap: 14 }}>
              <div className="card" style={{ padding: 12, background: "var(--surface-2)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                  <NFTArt seed={parseInt(tokenId.replace("#", "")) || collSeed} />
                </div>
                <div className="col" style={{ gap: 0 }}>
                  <span style={{ fontSize: 13 }}>{collection}</span>
                  <span className="mono muted" style={{ fontSize: 11 }}>{tokenId}</span>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 12 }}>
                <div><span className="label">Borrow amount (Ξ)</span><input className="input mono" type="number" step="0.1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="8.4" /></div>
                <div><span className="label">APR (%) <span style={{ cursor: "help", display: "inline-flex", alignItems: "center" }} onMouseEnter={() => setTooltip("APR is the annualized interest rate the borrower pays. A 14% APR on 8.4 Ξ over 30 days means ~0.098 Ξ in interest.")} onMouseLeave={() => setTooltip("")}><svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 6.5V7"/><circle cx="7" cy="10" r="0.4" fill="currentColor"/></svg></span></span><input className="input mono" type="number" step="0.1" value={apr} onChange={e => setApr(e.target.value)} /></div>
                {tooltip && <div className="card" style={{ padding: 8, fontSize: 11, lineHeight: 1.4, color: "var(--ink-2)", background: "var(--surface-2)" }}>{tooltip}</div>}
                <div><span className="label">Term (days)</span><input className="input mono" type="number" value={term} onChange={e => setTerm(e.target.value)} /></div>
                <div className="col" style={{ gap: 6, justifyContent: "flex-end" }}>
                  <span className="smallcaps">Implied LTV</span>
                  <span className="mono" style={{ fontSize: 18, color: impliedLtv > 75 ? "var(--risk)" : impliedLtv > 65 ? "var(--warn)" : "var(--accent)" }}>{impliedLtv}%</span>
                </div>
              </div>

              {impliedLtv > 75 && (
                <div className="warn-banner" style={{ background: "rgba(255, 71, 71, 0.05)", borderColor: "var(--risk)", color: "var(--risk)" }}>
                  <Icon.warn />
                  <div style={{ fontSize: 12 }}>High LTV detected. Loans above 75% LTV are significantly less likely to be funded by lenders.</div>
                </div>
              )}

              <div className="row" style={{ gap: 8 }}>
                <button className="btn" style={{ flex: 1 }} onClick={() => setStep(0)}>← Back</button>
                <button className="btn primary lg" style={{ flex: 1 }} disabled={!canReview} onClick={() => setStep(2)}>Review listing →</button>
              </div>
            </div>
          )}

          {/* STEP 2 — Review & sign */}
          {step === 2 && (
            <div className="col" style={{ gap: 14 }}>
              <div className="card" style={{ padding: 14, background: "var(--surface-2)" }}>
                <div className="kv"><span className="k">Collection</span><span className="v">{collection}</span></div>
                <div className="kv"><span className="k">Token ID</span><span className="v mono">{tokenId}</span></div>
                <div className="kv"><span className="k">Borrow amount</span><span className="v mono">{amount} Ξ</span></div>
                <div className="kv"><span className="k">APR</span><span className="v mono">{apr}%</span></div>
                <div className="kv"><span className="k">Term</span><span className="v mono">{term} days</span></div>
                <div className="kv"><span className="k">Implied LTV</span><span className="v mono" style={{ color: impliedLtv > 65 ? "var(--warn)" : "var(--accent)" }}>{impliedLtv}%</span></div>
                <div className="kv"><span className="k">Platform fee (1.5%)</span><span className="v mono">{platformFee.toFixed(3)} Ξ</span></div>
                <div className="kv"><span className="k">You receive at origination</span><span className="v mono" style={{ color: "var(--accent)" }}>{(Number(amount) - platformFee).toFixed(3)} Ξ</span></div>
              </div>

              <div className="warn-banner" style={{ alignItems: "flex-start" }}>
                <Icon.warn style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>You are about to sign a message confirming this listing.</div>
                  <span className="muted-2">Your NFT stays in your wallet. It will only be transferred to escrow when a lender accepts and funds the loan.</span>
                </div>
              </div>

              {error && <div className="warn-banner" style={{ fontSize: 12, color: "var(--risk)" }}>{error}</div>}

              <div className="row" style={{ gap: 8 }}>
                <button className="btn" style={{ flex: 1 }} onClick={() => setStep(1)} disabled={submitting}>← Back</button>
                <button className="btn primary lg" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Signing…" : "Sign & list"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("apr");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [showListModal, setShowListModal] = useState(false);
  const { isConnected, connect, isConnecting, address } = useWallet();

  useEffect(() => {
    fetch("/api/listings")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load listings");
        return json;
      }).then((j) => { setLoans(j.data || []); setLoading(false); })
      .catch((err) => { setError(err instanceof Error ? err.message : "Unable to load listings"); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let r = loans.filter((l) => {
      if (filter === "all") return true;
      if (filter === "my") return Boolean(address) && (l as LoanWithSeller).sellerAddress?.toLowerCase() === address?.toLowerCase();
      return l.status === filter;
    });
    if (collectionFilter !== "all") {
      const collIdx = COLLECTIONS.indexOf(collectionFilter as typeof COLLECTIONS[number]);
      if (collIdx >= 0) r = r.filter((l) => l.coll === collIdx);
    }
    if (sort === "apr") r = [...r].sort((a, b) => b.apr - a.apr);
    if (sort === "amt") r = [...r].sort((a, b) => b.amt - a.amt);
    if (sort === "ltv") r = [...r].sort((a, b) => a.ltv - b.ltv);
    return r;
  }, [filter, sort, loans, collectionFilter, address]);

  const chipData: [string, string, number][] = [
    ["all", "All", loans.length],
    ["my", "My Listings", loans.filter((l) => Boolean(address) && (l as LoanWithSeller).sellerAddress?.toLowerCase() === address?.toLowerCase()).length],
    ["open", "Open", loans.filter((l) => l.status === "open").length],
    ["funded", "Funded", loans.filter((l) => l.status === "funded").length],
    ["warn", "At risk", loans.filter((l) => l.status === "warn").length],
    ["default", "Defaulted", loans.filter((l) => l.status === "default").length],
  ];

  const handleListClick = () => {
    if (!isConnected) { connect(); return; }
    setShowListModal(true);
  };

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div className="eyebrow">Lend & Borrow</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Lend against {loans.length} listed NFTs.</h1>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn primary" onClick={handleListClick} disabled={isConnecting}>
            {isConnected ? "List your NFT" : isConnecting ? "Connecting…" : "Connect & list"}
          </button>
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
              <button key={k} className={"chip" + (filter === k ? " active" : "")} onClick={() => setFilter(k)}>{t} <span className="count">{n}</span></button>
            ))}
          </div>
          <div className="vsep" />
          <div className="row" style={{ gap: 8 }}>
            <span className="smallcaps">Collection</span>
            <Dropdown value={collectionFilter} options={["all", ...COLLECTIONS].map(c => ({ value: c, label: c === "all" ? "All collections" : c }))} onChange={setCollectionFilter} style={{ minWidth: 170 }} />
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

      {loading ? (
        <div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading listings…</div>
      ) : error ? (
        <div className="warn-banner" style={{ padding: 18 }}>{error}</div>
      ) : filtered.length === 0 ? (
        <div className="muted" style={{ padding: 80, textAlign: "center" }}>No loans match this filter.</div>
      ) : (
        <div className="grid grid-4">
          {filtered.map((l) => <LoanCard key={l.id} l={l} />)}
        </div>
      )}

      {showListModal && <ListNFTModal onClose={() => setShowListModal(false)} />}
    </main>
  );
}
