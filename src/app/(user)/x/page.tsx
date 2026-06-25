/* eslint-disable @next/next/no-img-element */
"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/icons";
import { useWallet } from "@/components/WalletProvider";
import { getEscrowAddress, writeFundDeal, writeListDeal, waitForDealId, hashMetadata, verificationCode, parseContractError } from "@/lib/contract";
import { parseEther, type Address } from "viem";
import type { XAccount } from "@/lib/data";
import { fmtCompact } from "@/lib/utils";

const X_DELIVERABLE_OPTIONS = [
  { key: "oauth", label: "OAuth token access" },
  { key: "twofa", label: "2FA codes & backup keys" },
  { key: "email", label: "Email address change" },
  { key: "phone", label: "Phone number transfer" },
  { key: "apps", label: "Connected apps list" },
  { key: "recovery", label: "Account recovery codes" },
  { key: "data", label: "Archive download (posts, DMs)" },
  { key: "domain", label: "Custom domain handoff" },
] as const;

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
  const { address, isConnected, connect } = useWallet();
  const [accounts, setAccounts] = useState<XAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listing, setListing] = useState(false);
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [deliverables, setDeliverables] = useState<Record<string, boolean>>({});
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [tweetUrl, setTweetUrl] = useState("");
  const [buying, setBuying] = useState("");

  const checkVerification = async () => {
    if (!tweetUrl || !handle) return;
    setVerifying(true);
    try {
      const res = await fetch(`/api/verify?type=x&handle=${encodeURIComponent(handle)}&tweetUrl=${encodeURIComponent(tweetUrl)}&code=${verifyCode}`);
      const json = await res.json();
      if (json.verified) {
        setVerified(true);
      } else {
        setError(`Not verified yet: ${json.reason || "Tweet not found or author mismatch."}`);
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
      const normalized = handle.startsWith("@") ? handle : `@${handle}`;
      const selectedDeliverables = X_DELIVERABLE_OPTIONS
        .filter((d) => deliverables[d.key])
        .map((d) => d.label);

      const metadata = {
        handle: normalized,
        followers: Number(followers || 0),
        price: Number(price),
        image: imageUrl,
        description,
        deliverables: selectedDeliverables,
        kind: "X Account",
        createdAt: new Date().toISOString(),
      };
      const metaHash = hashMetadata(metadata);

      // On-chain
      const txHash = await writeListDeal(address as Address, parseEther(price || "0"), metaHash);
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
          description,
          chainId: 8453,
          contractAddress: getEscrowAddress(),
          contractListingId,
          txHash,
          data: {
            handle: normalized,
            followers: Number(followers || 0),
            imageUrl,
            niche: "Pending review",
            age: "Unverified",
            engagement: 0,
            posts_30d: 0,
            growth: "0%",
            verified: false,
            includes: selectedDeliverables,
            metadataHash: metaHash,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to submit X listing");
      setVerifyCode(verificationCode(metaHash));
      setVerified(false);
      setTweetUrl("");
      setHandle("");
      setFollowers("");
      setPrice("");
      setImageUrl("");
      setDeliverables({});
      setDescription("");
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
    ["verified", "Verified",  accounts.filter(a => a.verified).length],
    ["small",    "<25k",      accounts.filter(a => a.followers < 25000).length],
    ["mid",      "25k-100k",  accounts.filter(a => a.followers >= 25000 && a.followers < 100000).length],
    ["large",    "100k+",     accounts.filter(a => a.followers >= 100000).length],
  ];

  const filt = useMemo(() => {
    let r = accounts;
    if (filter === "verified") r = r.filter(a => a.verified);
    if (filter === "small")    r = r.filter(a => a.followers < 25000);
    if (filter === "mid")      r = r.filter(a => a.followers >= 25000 && a.followers < 100000);
    if (filter === "large")    r = r.filter(a => a.followers >= 100000);
    if (sort === "followers") r = [...r].sort((a, b) => b.followers - a.followers);
    if (sort === "engage")    r = [...r].sort((a, b) => b.engagement - a.engagement);
    if (sort === "price")     r = [...r].sort((a, b) => a.price - b.price);
    return r;
  }, [filter, sort, accounts]);

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
      const txHash = await writeFundDeal(address as Address, BigInt(account.contractListingId), parseEther(String(account.price)));
      const res = await fetch("/api/escrows", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: account.id,
          buyerAddress: address,
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
          <div className="eyebrow">X Account Marketplace</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Buy or sell <em style={{ fontFamily: "var(--display)", fontStyle: "italic" }}>X handles</em> with verified history.
          </h1>
        </div>
        <div className="row" style={{ gap: 18, alignItems: "center" }}>
          <div className="col right" style={{ gap: 1 }}>
            <span className="smallcaps">Open listings</span>
            <span className="mono" style={{ fontSize: 14 }}>{accounts.length}</span>
          </div>
          <div className="col right" style={{ gap: 1 }}>
            <span className="smallcaps">Verified</span>
            <span className="mono" style={{ fontSize: 14 }}>{accounts.filter((account) => account.verified).length}</span>
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
                <div><span className="label">Price (Ξ)</span><input className="input mono" type="number" step="0.1" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
              </div>
              <div className="col" style={{ gap: 4 }}>
                <span className="label">Profile image URL</span>
                <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://pbs.twimg.com/profile_images/..." />
                {imageUrl && (
                  <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", border: "1px solid var(--line)", marginTop: 4 }}>
                    <img src={imageUrl} alt={`${handle} profile image preview`} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
              </div>
              <div className="col" style={{ gap: 4 }}>
                <span className="label">Description</span>
                <textarea className="input" style={{ minHeight: 50, resize: "vertical", padding: "10px 12px" }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What comes with this handle?" />
              </div>
              <div className="col" style={{ gap: 6 }}>
                <span className="label">Deliverables ({Object.values(deliverables).filter(Boolean).length} selected)</span>
                <div className="grid grid-2" style={{ gap: 6 }}>
                  {X_DELIVERABLE_OPTIONS.map((d) => (
                    <label key={d.key} style={{ padding: "8px 10px", border: deliverables[d.key] ? "1px solid var(--accent)" : "1px solid var(--line)", borderRadius: 6, cursor: "pointer", background: deliverables[d.key] ? "rgba(127,157,197,0.08)" : "transparent", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" checked={!!deliverables[d.key]} onChange={() => toggleDeliverable(d.key)} style={{ accentColor: "var(--accent)" }} />
                      {d.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="warn-banner"><Icon.warn /><div style={{ fontSize: 12 }}>Listing stored on-chain. Verify via tweet to make it visible.</div></div>

              {/* Verification section — shown after listing */}
              {verifyCode && !verified && (
                <div className="card" style={{ padding: 14, background: "rgba(127,157,197,0.08)", border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Prove ownership — post this tweet:</div>
                    <code className="mono" style={{ background: "var(--surface-2)", padding: "3px 8px", borderRadius: 4, fontSize: 11, display: "block", marginBottom: 8 }}>
                      Verifying @{handle?.replace("@", "")} ownership for Vault: {verifyCode}
                    </code>
                    <span className="label">Paste tweet URL</span>
                    <input className="input" value={tweetUrl} onChange={(e) => setTweetUrl(e.target.value)} placeholder="https://x.com/.../status/..." style={{ marginTop: 4 }} />
                  </div>
                  <button className="btn sm primary" onClick={checkVerification} disabled={verifying || !tweetUrl}>
                    {verifying ? "Checking…" : "Check verification"}
                  </button>
                </div>
              )}
              {verified && (
                <div className="card" style={{ padding: 14, background: "rgba(127,157,197,0.12)", border: "1px solid var(--accent)" }}>
                  <div className="pill funded" style={{ width: "fit-content" }}><span className="pdot" />Ownership verified!</div>
                </div>
              )}
              {error && <div className="warn-banner" style={{ color: "var(--risk)" }}>{error}</div>}
            </div>
            <div className="modal-f">
              <button className="btn" onClick={() => { setListing(false); setVerifyCode(""); setVerified(false); }}>Close</button>
              {!verifyCode ? (
                <button className="btn primary" disabled={submitting || !handle || !price} onClick={submitListing}>{submitting ? "Signing & listing…" : "Submit for review"}</button>
              ) : (
                <button className="btn primary" disabled={!verified} onClick={() => setListing(false)}>{verified ? "Done" : "Awaiting verification"}</button>
              )}
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
        {filt.map(a => (
          <article key={a.id} className="x-card">
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
