/* eslint-disable @next/next/no-img-element */
"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/icons";
import type { FarcasterAccount } from "@/lib/data";
import { fmtCompact } from "@/lib/utils";
import { useWallet } from "@/components/WalletProvider";
import { getEscrowAddress, writeFundDeal, writeListDeal, waitForDealId, hashMetadata, parseContractError } from "@/lib/contract";
import { parseEther, type Address } from "viem";

const FC_DELIVERABLE_OPTIONS = [
  { key: "fid", label: "FID transfer (on-chain)" },
  { key: "wallet", label: "Connected wallet handover" },
  { key: "recovery", label: "Recovery address update" },
  { key: "channel", label: "Channel ownership transfer" },
  { key: "keys", label: "Signer key rotation" },
  { key: "storage", label: "Storage units transfer" },
  { key: "casts", label: "Cast history export" },
  { key: "verifications", label: "Verification removal" },
] as const;

function ListFidModal({ onClose }: { onClose: () => void }) {
  const { address } = useWallet();
  const [fid, setFid] = useState("");
  const [handle, setHandle] = useState("");
  const [channel, setChannel] = useState("");
  const [followers, setFollowers] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [deliverables, setDeliverables] = useState<Record<string, boolean>>({});
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const checkFarcasterVerification = async () => {
    if (!fid || !address) return;
    setVerifying(true);
    try {
      const res = await fetch(`/api/verify?type=farcaster&fid=${fid}&address=${address}`);
      const json = await res.json();
      if (json.verified) {
        setVerified(true);
        setDone("On-chain ownership verified! Listing is visible to buyers.");
      } else {
        setError(`Not verified: ${json.reason || "Connected wallet does not own FID " + fid}`);
      }
    } catch {
      setError("Verification check failed. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  const toggleDeliverable = (key: string) => {
    setDeliverables((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const submitListing = async () => {
    if (!address) return;
    setSubmitting(true);
    setError("");
    try {
      const selectedDeliverables = FC_DELIVERABLE_OPTIONS
        .filter((d) => deliverables[d.key])
        .map((d) => d.label);

      const metadata = {
        fid: Number(fid),
        handle: handle.replace(/^@/, ""),
        channel: channel.replace(/^\//, "") || "general",
        followers: Number(followers || 0),
        price: Number(price),
        image: imageUrl,
        description,
        deliverables: selectedDeliverables,
        kind: "Farcaster FID",
        createdAt: new Date().toISOString(),
      };
      const metaHash = hashMetadata(metadata);

      // On-chain
      const txHash = await writeListDeal(address as Address, parseEther(price || "0"), metaHash);
      const contractListingId = await waitForDealId(txHash);

      // API
      const res = await fetch("/api/marketplace/farcaster", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress: address,
          title: handle.startsWith("@") ? handle.slice(1) : handle,
          description: description || `Farcaster FID ${fid}${channel ? ` in /${channel}` : ""}`,
          price: Number(price),
          chainId: 8453,
          contractAddress: getEscrowAddress(),
          contractListingId,
          txHash,
          data: {
            fid: Number(fid),
            handle: handle.replace(/^@/, ""),
            imageUrl,
            channel: channel.replace(/^\//, "") || "general",
            followers: Number(followers || 0),
            casts_30d: 0,
            rev_30d: 0,
            power_badge: false,
            verified: false,
            includes: selectedDeliverables,
            metadataHash: metaHash,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to submit FID listing");
      setVerified(false);
      setDone("Listed on-chain. Verify on-chain ownership to make it visible.");
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-h">
          <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>List Farcaster FID</h3>
          <button className="btn ghost sm" onClick={onClose}><Icon.x /></button>
        </div>
        <div className="modal-b" style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "70vh", overflowY: "auto" }}>
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
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">Asking price (Ξ)</span>
              <input className="input mono" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="8.5" />
            </div>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">Profile image URL</span>
              <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="label">Description</span>
            <textarea className="input" style={{ minHeight: 50, resize: "vertical", padding: "10px 12px" }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What comes with this FID?" />
          </div>
          <div className="col" style={{ gap: 6 }}>
            <span className="label">Deliverables ({Object.values(deliverables).filter(Boolean).length} selected)</span>
            <div className="grid grid-2" style={{ gap: 6 }}>
              {FC_DELIVERABLE_OPTIONS.map((d) => (
                <label key={d.key} style={{ padding: "8px 10px", border: deliverables[d.key] ? "1px solid var(--accent)" : "1px solid var(--line)", borderRadius: 6, cursor: "pointer", background: deliverables[d.key] ? "rgba(127,157,197,0.08)" : "transparent", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={!!deliverables[d.key]} onChange={() => toggleDeliverable(d.key)} style={{ accentColor: "var(--accent)" }} />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
          <div className="warn-banner">
            <Icon.warn />
            <div style={{ fontSize: 11 }}>Stored on-chain. Connected wallet must own the FID to verify.</div>
          </div>

          {/* Verification */}
          {done && !verified && (
            <div className="card" style={{ padding: 14, background: "rgba(127,157,197,0.08)", border: "1px solid var(--line)" }}>
              <div className="pill funded" style={{ width: "fit-content", marginBottom: 10 }}><span className="pdot" />{done}</div>
              <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>On-chain verification</div>
                <span className="muted-2">We check the Farcaster IdRegistry to confirm your connected wallet ({address?.slice(0, 6)}…{address?.slice(-4)}) owns FID #{fid}.</span>
              </div>
              <button className="btn sm primary" onClick={checkFarcasterVerification} disabled={verifying}>
                {verifying ? "Checking on-chain…" : "Verify ownership"}
              </button>
            </div>
          )}
          {verified && (
            <div className="card" style={{ padding: 14, background: "rgba(127,157,197,0.12)", border: "1px solid var(--accent)" }}>
              <div className="pill funded" style={{ width: "fit-content" }}><span className="pdot" />{done}</div>
            </div>
          )}
          {error && <div className="warn-banner" style={{ color: "var(--risk)" }}>{error}</div>}
        </div>
        <div className="modal-f">
          <button className="btn" style={{ flex: 1 }} onClick={() => { onClose(); setDone(""); setVerified(false); }}>Close</button>
          {!done ? (
            <button className="btn primary lg" style={{ flex: 1 }} onClick={submitListing} disabled={submitting || !fid || !handle || !price}>
              {submitting ? "Signing & listing…" : "Submit for review"}
            </button>
          ) : (
            <button className="btn primary lg" style={{ flex: 1 }} disabled={!verified} onClick={onClose}>{verified ? "Done" : "Awaiting verification"}</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FarcasterPage() {
  const router = useRouter();
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
      const txHash = await writeFundDeal(address as Address, BigInt(account.contractListingId), parseEther(String(account.price)));
      const res = await fetch("/api/escrows", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: account.id,
          sellerAddress: account.sellerAddress,
          amount: account.price,
          currency: "ETH",
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
            {filt.map(a => (
              <tr key={a.id} style={{ cursor: "pointer" }}>
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
                <td className="right mono">{a.rev_30d > 0 ? `${a.rev_30d} Ξ` : <span className="muted-2">—</span>}</td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    {a.power_badge && <span className="pill" style={{ background: "color-mix(in oklab, var(--gold) 14%, transparent)", color: "var(--gold)", borderColor: "color-mix(in oklab, var(--gold) 30%, transparent)" }}><span className="pdot" style={{ background: "var(--gold)" }}/>Power</span>}
                    {a.verified && <span className="pill funded"><span className="pdot"/>Verified</span>}
                  </div>
                </td>
                <td className="right mono" style={{ color: "var(--ink)" }}>{a.price} Ξ</td>
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
        <div className="metric"><span className="lab">Avg sale price</span><span className="val">{(accounts.reduce((a, b) => a + b.price, 0) / (accounts.length || 1)).toFixed(1)} Ξ</span><span className="delta">last 30 days</span></div>
        <div className="metric"><span className="lab">Power badge</span><span className="val">{accounts.filter((account) => account.power_badge).length}</span><span className="delta">live listings</span></div>
        <div className="metric"><span className="lab">Median followers listed</span><span className="val">{fmtCompact(accounts[Math.floor(accounts.length / 2)]?.followers || 0)}</span><span className="delta">from current inventory</span></div>
      </div>
      </>}
    </main>
  );
}
