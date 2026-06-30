/* eslint-disable @next/next/no-img-element */
"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/icons";
import ListFidModal from "@/components/ListFidModal";
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

  return (
    <main id="main-content" role="main" aria-label="Main content" className="main">
      <div className="row between" style={{ alignItems: "center", marginBottom: 22, gap: 24, rowGap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 4 }}>
            <img src="/farcaster.png" alt="Farcaster" style={{ width: 28, height: 28 }} />
            <div className="eyebrow">Farcaster FID Marketplace</div>
          </div>
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
            {displayedAccounts.map(a => (
              <tr key={a.id} style={{ cursor: "pointer", ...(a.id === selectedId ? { outline: "1px solid var(--accent)", outlineOffset: -1 } : {}) }}>
                <td className="mono" style={{ color: "var(--ink)" }}>
                  #{a.fid}
                </td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <div className="x-avatar" style={{ width: 26, height: 26, fontSize: 11, background: a.imageUrl ? "transparent" : "linear-gradient(135deg, #8A63D2, #a67ee5)", color: "#fff" }}>
                      {a.imageUrl ? (
                        <img src={a.imageUrl} alt={`@${a.handle} avatar`} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        a.handle.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <span style={{ fontSize: 13 }}>@{a.handle}</span>
                  </div>
                </td>
                <td className="muted">/{a.channel}</td>
                <td className="right mono">{fmtCompact(a.followers)}</td>
                <td className="right mono">{a.casts_30d}</td>
                <td className="right mono">{a.rev_30d > 0 ? `${fmtUSDC(a.rev_30d)} USDC` : <span className="muted-2">—</span>}</td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    {a.power_badge && <span className="pill" style={{ background: "color-mix(in oklab, var(--gold) 14%, transparent)", color: "var(--gold)", borderColor: "color-mix(in oklab, var(--gold) 30%, transparent)" }}><span className="pdot" style={{ background: "var(--gold)" }}/>Power</span>}
                  </div>
                </td>
                <td className="right mono" style={{ color: "var(--ink)" }}>{a.price} USDC</td>
                <td className="right">
                  <button className="btn sm primary" onClick={() => fundEscrow(a)} disabled={buying === a.id || a.sellerAddress?.toLowerCase() === address?.toLowerCase()}>
                    {buying === a.id ? "Funding..." : a.sellerAddress?.toLowerCase() === address?.toLowerCase() ? "Yours" : "Buy"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-3" style={{ marginTop: 18 }}>
        <div className="metric"><span className="lab">Avg sale price</span><span className="val">{(accounts.reduce((a, b) => a + b.price, 0) / (accounts.length || 1)).toFixed(1)} USDC</span><span className="delta">listed inventory</span></div>
        <div className="metric"><span className="lab">Power badge</span><span className="val">{accounts.filter((account) => account.power_badge).length}</span><span className="delta">live listings</span></div>
        <div className="metric"><span className="lab">Median followers listed</span><span className="val">{fmtCompact(accounts[Math.floor(accounts.length / 2)]?.followers || 0)}</span><span className="delta">from current inventory</span></div>
      </div>
      </>}
    </main>
  );
}
