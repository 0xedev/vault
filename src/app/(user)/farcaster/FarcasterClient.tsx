/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/icons";
import ListFidModal from "@/components/ListFidModal";
import SubmitDealOfferModal from "@/components/SubmitDealOfferModal";
import ListingMessageModal from "@/components/ListingMessageModal";
import BackButton from "@/components/BackButton";
import type { FarcasterAccount } from "@/lib/data";
import { fmtCompact, fmtUSDC } from "@/lib/utils";
import { useWallet } from "@/components/WalletProvider";
import { getEscrowAddress, getPublicClient, getDealsAddress, writeFundDeal, parseContractError, writeApproveUsdc } from "@/lib/contract";
import { parseUnits, type Address } from "viem";

export default function FarcasterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const { isConnected, connect, address } = useWallet();
  const [accounts, setAccounts] = useState<FarcasterAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState("followers");
  const [filter, setFilter] = useState("all");
  const [listing, setListing] = useState(false);
  const [buying, setBuying] = useState("");
  const [offerListing, setOfferListing] = useState<FarcasterAccount | null>(null);
  const [messageListing, setMessageListing] = useState<FarcasterAccount | null>(null);

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
    const effectiveFilter = selectedId ? "all" : filter;
    if (effectiveFilter === "power") r = r.filter(a => a.power_badge);
    if (sort === "followers") r = [...r].sort((a, b) => b.followers - a.followers);
    if (sort === "rev")       r = [...r].sort((a, b) => b.rev_30d - a.rev_30d);
    if (sort === "price")     r = [...r].sort((a, b) => a.price - b.price);
    return r;
  }, [filter, selectedId, sort, accounts]);
  const displayedAccounts = useMemo(() => {
    if (!selectedId) return filt;
    const selected = accounts.find((account) => account.id === selectedId);
    if (!selected) return filt;
    return [selected, ...filt.filter((account) => account.id !== selectedId)];
  }, [accounts, filt, selectedId]);

  const chips: [string, string, number][] = [
    ["all",      "All FIDs",     accounts.length],
    ["power",    "Power badge",  accounts.filter(a => a.power_badge).length],
  ];

  const fundEscrow = async (account: FarcasterAccount) => {
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

  const messageSeller = async (account: FarcasterAccount) => {
    if (!isConnected || !address) {
      await connect();
      return;
    }
    setMessageListing(account);
  };

  return (
    <main id="main-content" role="main" aria-label="Main content" className="main">
      <BackButton />
      <div className="row between" style={{ alignItems: "center", marginBottom: 22, gap: 24, rowGap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 4 }}>
            <img src="/farcaster.png" alt="Farcaster" style={{ width: 28, height: 28 }} />
            <div className="eyebrow">Farcaster FID Marketplace</div>
          </div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Buy &amp; sell <em style={{ fontFamily: "var(--display)", fontStyle: "italic" }}>Farcaster accounts</em> on-chain.
          </h1>
        </div>
        <div className="row" style={{ gap: 18, alignItems: "center" }}>
          <div className="market-inline-stats">
            <span><strong>{accounts.length}</strong> listings</span>
            <span><strong>{accounts.filter((account) => account.power_badge).length}</strong> power</span>
            <span><strong>{fmtCompact(accounts[Math.floor(accounts.length / 2)]?.followers || 0)}</strong> median followers</span>
            <span><strong>{(accounts.reduce((a, b) => a + b.price, 0) / (accounts.length || 1)).toFixed(1)}</strong> avg USDC</span>
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
      <div className="grid grid-3">
        {displayedAccounts.map(a => {
          const isOwnListing = a.sellerAddress?.toLowerCase() === address?.toLowerCase();
          return (
            <article key={a.id} className="x-card farcaster-card" style={a.id === selectedId ? { borderColor: "var(--accent)" } : undefined}>
              <div className="x-head">
                <div className="x-avatar farcaster-avatar">
                  {a.imageUrl ? (
                    <img src={a.imageUrl} alt={`@${a.handle} avatar`} style={{ width: "100%", height: "100%", borderRadius: 10, objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    a.handle.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 500 }} className="trunc">@{a.handle}</span>
                    {a.power_badge && <span className="pill gold"><span className="pdot" />Power</span>}
                  </div>
                  <span className="muted-2" style={{ fontSize: 11.5 }}>FID #{a.fid}{a.channel ? ` · /${a.channel}` : ""}</span>
                </div>
                <img src="/farcaster.png" alt="" style={{ width: 24, height: 24, opacity: 0.72 }} />
              </div>
              <div className="x-stats">
                <div className="col" style={{ gap: 1 }}><span className="meta">Followers</span><span className="amt mono" style={{ fontSize: 14 }}>{fmtCompact(a.followers)}</span></div>
                <div className="col" style={{ gap: 1 }}><span className="meta">Casts / 30d</span><span className="amt mono" style={{ fontSize: 14 }}>{a.casts_30d}</span></div>
                <div className="col" style={{ gap: 1 }}><span className="meta">Revenue</span><span className="amt mono" style={{ fontSize: 14 }}>{a.rev_30d > 0 ? fmtUSDC(a.rev_30d) : "0"}</span></div>
              </div>
              <div className="row between" style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: "auto" }}>
                <span className="meta">Asking</span>
                <span className="mono" style={{ fontSize: 16 }}>{fmtUSDC(a.price)} <span style={{ color: "var(--ink-3)", fontSize: 12 }}>USDC</span></span>
              </div>
              <div className="market-card-actions">
                <button className="btn primary" onClick={() => fundEscrow(a)} disabled={buying === a.id || isOwnListing}>
                  {buying === a.id ? "Funding..." : isOwnListing ? "Your listing" : "Buy now"}
                </button>
                <button className="btn" onClick={() => setOfferListing(a)} disabled={isOwnListing}>
                  Propose offer
                </button>
                <button className="btn ghost" onClick={() => messageSeller(a)} disabled={isOwnListing}>
                  Msg seller
                </button>
              </div>
            </article>
          );
        })}
      </div>

      </>}
      {offerListing && (
        <SubmitDealOfferModal
          listing={{
            id: offerListing.id,
            title: `@${offerListing.handle}`,
            price: offerListing.price,
            sellerAddress: offerListing.sellerAddress,
            contractListingId: offerListing.contractListingId,
            contractAddress: offerListing.contractAddress,
            chainId: offerListing.chainId,
          }}
          onClose={() => setOfferListing(null)}
        />
      )}
      {messageListing && (
        <ListingMessageModal
          listing={{
            id: messageListing.id,
            title: `@${messageListing.handle}`,
            sellerAddress: messageListing.sellerAddress,
          }}
          onClose={() => setMessageListing(null)}
        />
      )}
    </main>
  );
}
