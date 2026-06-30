/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/icons";
import SubmitDealOfferModal from "@/components/SubmitDealOfferModal";
import { useWallet } from "@/components/WalletProvider";
import { getEscrowAddress, getPublicClient, getDealsAddress, writeFundDeal, writeListDeal, waitForDealId, hashMetadata, parseContractError, writeApproveUsdc } from "@/lib/contract";
import { parseUnits, type Address } from "viem";
import type { XAccount } from "@/lib/data";
import { fmtCompact } from "@/lib/utils";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const { address, isConnected, connect } = useWallet();
  const [accounts, setAccounts] = useState<XAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listing, setListing] = useState(false);
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [buying, setBuying] = useState("");
  const [offerListing, setOfferListing] = useState<XAccount | null>(null);

  const submitListing = async () => {
    if (!address) return;
    setSubmitting(true);
    setError("");
    try {
      const normalized = handle.startsWith("@") ? handle : `@${handle}`;

      const metadata = {
        handle: normalized,
        followers: Number(followers || 0),
        price: Number(price),
        kind: "X Account",
        createdAt: new Date().toISOString(),
      };
      const metaHash = hashMetadata(metadata);

      // On-chain
      const txHash = await writeListDeal(address as Address, parseUnits(price || "0", 6), metaHash);
      const contractListingId = await waitForDealId(txHash);

      // API
      const res = await fetch("/api/marketplace/x-accounts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sellerAddress: address,
            title: normalized,
            price: Number(price),
            description: null,
            chainId: 8453,
            contractAddress: getEscrowAddress(),
            contractListingId,
            txHash,
            data: {
              handle: normalized,
              followers: Number(followers || 0),
              engagement: 0,
              posts_30d: 0,
              growth: "0%",
              metadataHash: metaHash,
            },
          }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to submit X listing");
      setHandle("");
      setFollowers("");
      setPrice("");
      setListing(false);
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("followers");

  useEffect(() => {
    fetch("/api/marketplace/x-accounts")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load X accounts");
        return json;
      }).then((j) => { setAccounts(j.data || []); setLoading(false); })
      .catch((err) => { setError(err instanceof Error ? err.message : "Unable to load X accounts"); setLoading(false); });
  }, []);

  const chips: [string, string, number][] = [
    ["all",      "All",       accounts.length],
    ["small",    "<25k",      accounts.filter(a => a.followers < 25000).length],
    ["mid",      "25k-100k",  accounts.filter(a => a.followers >= 25000 && a.followers < 100000).length],
    ["large",    "100k+",     accounts.filter(a => a.followers >= 100000).length],
  ];

  const filt = useMemo(() => {
    let r = accounts;
    const effectiveFilter = selectedId ? "all" : filter;
    if (effectiveFilter === "small")    r = r.filter(a => a.followers < 25000);
    if (effectiveFilter === "mid")      r = r.filter(a => a.followers >= 25000 && a.followers < 100000);
    if (effectiveFilter === "large")    r = r.filter(a => a.followers >= 100000);
    if (sort === "followers") r = [...r].sort((a, b) => b.followers - a.followers);
    if (sort === "engage")    r = [...r].sort((a, b) => b.engagement - a.engagement);
    if (sort === "price")     r = [...r].sort((a, b) => a.price - b.price);
    return r;
  }, [filter, selectedId, sort, accounts]);
  const displayedAccounts = useMemo(() => {
    if (!selectedId) return filt;
    const selected = accounts.find((account) => account.id === selectedId);
    if (!selected) return filt;
    return [selected, ...filt.filter((account) => account.id !== selectedId)];
  }, [accounts, filt, selectedId]);

  const fundEscrow = async (account: XAccount) => {
    if (!isConnected || !address) {
      await connect();
      return;
    }
    setBuying(account.id);
    setError("");
    try {
      if (!account.sellerAddress) throw new Error("Listing seller is missing.");
      if (account.sellerAddress.toLowerCase() === address.toLowerCase()) throw new Error("You cannot buy your own listing.");
      if (!account.contractListingId) throw new Error("Listing is pending chain sync. Try again after the listing transaction is confirmed.");
      const amtWei = parseUnits(String(account.price), 6);
      const approveHash = await writeApproveUsdc(address as Address, await getDealsAddress(), amtWei);
      await getPublicClient().waitForTransactionReceipt({ hash: approveHash });
      const txHash = await writeFundDeal(address as Address, BigInt(account.contractListingId), amtWei);
      const res = await fetch("/api/escrows", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: account.id,
          buyerAddress: address,
          sellerAddress: account.sellerAddress,
          amount: account.price,
          currency: "USDC",
          chainId: account.chainId || 8453,
          contractAddress: account.contractAddress || getEscrowAddress(),
          contractListingId: account.contractListingId,
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
          <div className="eyebrow">X Account Marketplace</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Buy or sell <em style={{ fontFamily: "var(--display)", fontStyle: "italic" }}>X handles</em> through escrow.
          </h1>
        </div>
        <div className="row" style={{ gap: 18, alignItems: "center" }}>
          <div className="col right" style={{ gap: 1 }}>
            <span className="smallcaps">Open listings</span>
            <span className="mono" style={{ fontSize: 14 }}>{accounts.length}</span>
          </div>
          <button className="btn primary" onClick={() => isConnected ? setListing(true) : connect()}>
            {isConnected ? "List account" : "Connect to list"}
          </button>
        </div>
      </div>

      {listing && (
        <div className="modal-bg" onClick={() => setListing(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-h">
              <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>List X account</h3>
              <button className="btn ghost sm" onClick={() => setListing(false)}><Icon.x /></button>
            </div>
            <div className="modal-b col" style={{ gap: 14, maxHeight: "70vh", overflowY: "auto" }}>
              <div><span className="label">Handle</span><input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle" /></div>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div><span className="label">Followers</span><input className="input mono" type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} /></div>
                <div><span className="label">Amount (USDC)</span><input className="input mono" type="number" step="0.1" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
              </div>
              <div className="warn-banner"><Icon.warn /><div style={{ fontSize: 12 }}>Listing stored on-chain. Buyer releases escrow after confirming transfer.</div></div>
              {error && <div className="warn-banner" style={{ color: "var(--risk)" }}>{error}</div>}
            </div>
            <div className="modal-f">
              <button className="btn" onClick={() => setListing(false)}>Close</button>
              <button className="btn primary" disabled={submitting || !handle || !price} onClick={submitListing}>{submitting ? "Signing & listing…" : "List account"}</button>
            </div>
          </div>
        </div>
      )}

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

      {loading ? <div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading…</div> : error ? <div className="warn-banner" style={{ padding: 18 }}>{error}</div> : (
      <div className="grid grid-3">
        {displayedAccounts.map(a => (
          <article key={a.id} className="x-card" style={a.id === selectedId ? { borderColor: "var(--accent)" } : undefined}>
            <div className="x-head">
              <div className="x-avatar">
                {a.imageUrl ? (
                  <img src={a.imageUrl} alt={`${a.handle} avatar`} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  a.handle.slice(1, 3).toUpperCase()
                )}
              </div>
              <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }} className="trunc">{a.handle}</span>
                </div>
                <span className="muted-2" style={{ fontSize: 11.5 }}>{a.niche || "X handle"} · buyer-confirmed escrow</span>
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
              <span className="mono" style={{ fontSize: 16 }}>{a.price} <span style={{ color: "var(--ink-3)", fontSize: 12 }}>USDC</span></span>
            </div>
            <button className="btn primary" onClick={() => fundEscrow(a)} disabled={buying === a.id || a.sellerAddress?.toLowerCase() === address?.toLowerCase()} style={{ width: "100%", justifyContent: "center" }}>
              {buying === a.id ? "Funding escrow..." : a.sellerAddress?.toLowerCase() === address?.toLowerCase() ? "Your listing" : "Buy with escrow"}
            </button>
            <button className="btn" onClick={() => setOfferListing(a)} disabled={a.sellerAddress?.toLowerCase() === address?.toLowerCase()} style={{ width: "100%", justifyContent: "center" }}>
              Submit offer
            </button>
          </article>
        ))}
      </div>
      )}
      {offerListing && (
        <SubmitDealOfferModal
          listing={{
            id: offerListing.id,
            title: offerListing.handle,
            price: offerListing.price,
            sellerAddress: offerListing.sellerAddress,
            contractListingId: offerListing.contractListingId,
            contractAddress: offerListing.contractAddress,
            chainId: offerListing.chainId,
          }}
          onClose={() => setOfferListing(null)}
        />
      )}
    </main>
  );
}
