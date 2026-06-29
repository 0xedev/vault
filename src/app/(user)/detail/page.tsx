"use client";
/* eslint-disable @next/next/no-img-element */

export const dynamic = "force-dynamic";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/icons";
import NFTArt from "@/components/NFTArt";
import StatusPill from "@/components/StatusPill";
import { COLLECTIONS } from "@/lib/data";
import { fmtETH } from "@/lib/utils";
import { shortAddress } from "@/lib/api";
import { useWallet } from "@/components/WalletProvider";
import { getPublicClient, writeSubmitOffer, writeAcceptOffer, writeRepay, writeClaimCollateral, writeWithdrawOffer, writeCancelListing, writeRepayPartial, parseContractError, readDeadline, writeApproveUsdc, getEscrowAddress } from "@/lib/contract";
import { parseUnits, type Address, type Hash } from "viem";
import type { Loan } from "@/lib/data";
import { shareAsCast } from "@/lib/farcaster-sdk";

type LoanRecord = Loan & { collection?: string; sellerAddress?: string };
type OfferRecord = {
  id: string;
  who: string;
  offererAddress?: string;
  amt: number;
  apr: number;
  term: number;
  when: string;
  status: string;
  txHash?: Hash;
};

async function waitForTx(hash: Hash) {
  await getPublicClient().waitForTransactionReceipt({ hash });
  return hash;
}

function CounterOfferModal({ onClose, l, prefillAmt, prefillApr, prefillTerm }: { onClose: () => void; l: LoanRecord; prefillAmt?: number; prefillApr?: number; prefillTerm?: number }) {
  const { isConnected, connect, isConnecting, address } = useWallet();
  const [amt, setAmt] = useState(prefillAmt ?? l.amt * 0.95);
  const [apr, setApr] = useState(prefillApr ?? l.apr);
  const [term, setTerm] = useState(prefillTerm ?? l.term);
  const [exp, setExp] = useState(24);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [modalError, setModalError] = useState("");

  const handleSubmit = async () => {
    if (!address) return;
    setSubmitting(true);
    try {
      if (!l.contractListingId) throw new Error("Listing is pending chain sync. Try again after the listing transaction is confirmed.");
      const amtWei = parseUnits(amt.toFixed(4), 6);
      // 1. Approve USDC
      await waitForTx(await writeApproveUsdc(address as Address, getEscrowAddress(), amtWei));
      // 2. Deposit USDC into escrow contract
      const aprBps = Math.round(apr * 100);
      const txHash = await waitForTx(await writeSubmitOffer(
        address as Address,
        BigInt(l.contractListingId),
        amtWei,
        aprBps,
        term,
      ));

      // 2. POST to API
      const res = await fetch("/api/offers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: l.id,
          offererAddress: address,
          amount: amt,
          apr,
          termDays: term,
          expiresInHours: exp,
          chainId: 8453,
          txHash,
        }),
      });
      if (!res.ok) throw new Error("Counter submission failed");
      setDone(true);
      setModalError("");
    } catch (e) {
      setModalError(parseContractError(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="modal-bg" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-h">
            <h3 className="serif" style={{ margin: 0, fontSize: 22 }}>Connect to counter</h3>
            <button className="btn ghost sm" onClick={onClose}><Icon.x /></button>
          </div>
          <div className="modal-b" style={{ textAlign: "center", padding: "40px 22px" }}>
            <p className="muted" style={{ margin: "0 0 20px", fontSize: 14 }}>Connect your wallet to submit a counter-offer.</p>
            <button className="btn primary lg" onClick={connect} disabled={isConnecting}>
              {isConnecting ? "Connecting…" : "Connect wallet"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>{done ? "Offer sent!" : "Counter-offer"}</h3>
          <button className="btn ghost sm" onClick={onClose}><Icon.x /></button>
        </div>
        <div className="modal-b" style={{ paddingTop: 16, paddingBottom: 16 }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <Icon.check style={{ width: 36, height: 36, color: "var(--accent)" }} />
              <p style={{ fontSize: 14, margin: "12px 0 4px" }}>{fmtETH(amt)} USDC at {apr}% / {term}d submitted.</p>
              <p className="muted-2" style={{ fontSize: 12 }}>The borrower can now accept, reject, or counter.</p>
            </div>
          ) : (
            <>
              <p className="muted" style={{ marginTop: 0, fontSize: 12, lineHeight: 1.4 }}>
                Listed: {fmtETH(l.amt)} USDC at {l.apr}% / {l.term}d. Submit your terms.
              </p>
              <div className="grid grid-2" style={{ marginTop: 12, gap: 10 }}>
                <div><span className="label">Amount (USDC)</span><input className="input mono" type="number" step="0.1" value={amt} onChange={(e) => setAmt(+e.target.value)} /></div>
                <div><span className="label">APR (%)</span><input className="input mono" type="number" step="0.1" value={apr} onChange={(e) => setApr(+e.target.value)} /></div>
                <div><span className="label">Term (days)</span><input className="input mono" type="number" value={term} onChange={(e) => setTerm(+e.target.value)} /></div>
                <div><span className="label">Expires (h)</span><input className="input mono" type="number" value={exp} onChange={(e) => setExp(+e.target.value)} /></div>
              </div>
              <div className="card" style={{ padding: 10, marginTop: 12, background: "var(--surface-2)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div className="col" style={{ gap: 1 }}><span className="smallcaps" style={{ fontSize: 9 }}>Repayment</span><span className="mono" style={{ fontSize: 12 }}>{(amt * (1 + apr / 100 * term / 365)).toFixed(2)} USDC</span></div>
                <div className="col" style={{ gap: 1 }}><span className="smallcaps" style={{ fontSize: 9 }}>LTV</span><span className="mono" style={{ fontSize: 12 }}>{l.value > 0 ? Math.round(amt / l.value * 100) : 0}%</span></div>
                <div className="col" style={{ gap: 1 }}><span className="smallcaps" style={{ fontSize: 9 }}>Expires</span><span className="mono" style={{ fontSize: 12 }}>{exp}h</span></div>
              </div>
            </>
          )}
          {modalError && <div className="warn-banner" style={{ marginTop: 8, color: "var(--risk)", fontSize: 12 }}>{modalError}</div>}
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose} style={{ flex: 1 }}>{done ? "Close" : "Cancel"}</button>
          {!done && <button className="btn primary" onClick={handleSubmit} disabled={submitting} style={{ flex: 1 }}>{submitting ? "Submitting…" : "Submit counter"}</button>}
        </div>
      </div>
    </div>
  );

}

function LoanDetailContent() {
  const searchParams = useSearchParams();
  const loanId = searchParams.get("id");
  const [loan, setLoan] = useState<LoanRecord | null>(null);
  const [offers, setOffers] = useState<OfferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("offers");
  const [modal, setModal] = useState<string | null>(null);
  const [offerAction, setOfferAction] = useState("");
  const [matchOffer, setMatchOffer] = useState<{ amt: number; apr: number; term: number } | null>(null);
  const [matching, setMatching] = useState("");
  const [repaying, setRepaying] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [repayingPartial, setRepayingPartial] = useState(false);
  const [partialAmt, setPartialAmt] = useState("");
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const { address } = useWallet();

  // Farcaster Mini App embed
  useEffect(() => {
    if (typeof document === "undefined" || !loanId) return;
    const existing = document.querySelector('meta[name="fc:miniapp"]');
    if (existing) existing.remove();
    const meta = document.createElement("meta");
    meta.name = "fc:miniapp";
    meta.content = JSON.stringify({
      version: "1",
      imageUrl: "https://baseshirehethaway.com/nft.png",
      button: {
        title: "View NFT listing",
        action: {
          type: "launch_frame",
          name: "Baseshire Hethaway",
          url: `${window.location.origin}/detail?id=${loanId}`,
          splashImageUrl: "https://baseshirehethaway.com/logo.png",
          splashBackgroundColor: "#0052ff",
        },
      },
    });
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, [loanId]);

  // Live countdown tick
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const submitMatch = async (o: OfferRecord) => {
    if (!address || !loan) return;
    setMatching(o.id);
    try {
      if (!loan.contractListingId) throw new Error("Listing is pending chain sync. Try again after the listing transaction is confirmed.");
      const amtWei = parseUnits(o.amt.toFixed(4), 6);
      // 1. Approve USDC
      await waitForTx(await writeApproveUsdc(address as Address, getEscrowAddress(), amtWei));
      // 2. Deposit USDC via contract
      const aprBps = Math.round(o.apr * 100);
      const txHash = await waitForTx(await writeSubmitOffer(
        address as Address,
        BigInt(loan.contractListingId),
        amtWei,
        aprBps,
        o.term,
      ));

      // 2. POST to API
      const res = await fetch("/api/offers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: loan.id,
          offererAddress: address,
          amount: o.amt,
          apr: o.apr,
          termDays: o.term,
          chainId: 8453,
          txHash,
        }),
      });
      if (!res.ok) throw new Error("Match failed");
      setOffers((current) => [...current, { id: `O-${Date.now()}`, who: shortAddress(address), offererAddress: address, amt: o.amt, apr: o.apr, term: o.term, when: new Date().toISOString(), status: "pending" }]);
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setMatching("");
    }
  };

  useEffect(() => {
    const url = loanId ? `/api/listings/${loanId}` : "/api/listings?limit=1";
    fetch(url)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load listing");
        return json;
      })
      .then((json) => {
        const data = loanId ? json.data : json.data?.[0];
        setLoan(data || null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load listing");
        setLoading(false);
      });
  }, [loanId]);

  useEffect(() => {
    if (!loan?.id) return;
    fetch(`/api/offers?listingId=${loan.id}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load offers");
        return json;
      })
      .then((json) => setOffers(json.data || []))
      .catch(() => setOffers([]));
  }, [loan?.id]);

  // Fetch on-chain deadline when loan has contractListingId
  useEffect(() => {
    if (!loan?.contractListingId || loan.status === "repaid" || loan.status === "default") return;
    readDeadline(BigInt(loan.contractListingId))
      .then(d => setDeadline(Number(d) * 1000))
      .catch(() => {});
  }, [loan?.contractListingId, loan?.status]);

  if (loading) return <main id="main-content" role="main" aria-label="Main content" className="main"><div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading…</div></main>;
  if (error) return <main id="main-content" role="main" aria-label="Main content" className="main"><div className="warn-banner" style={{ margin: 80 }}>{error}</div></main>;
  if (!loan) return <main id="main-content" role="main" aria-label="Main content" className="main"><div className="muted" style={{ padding: 80, textAlign: "center" }}>Listing not found.</div></main>;

  const l = loan;
  const collectionName = l.collection || COLLECTIONS[l.coll] || "Unknown collection";
  const isSeller = Boolean(address && l.sellerAddress && address.toLowerCase() === l.sellerAddress.toLowerCase());
  const updateOfferStatus = async (id: string, status: "accepted" | "rejected", offer: OfferRecord) => {
    setOfferAction(id);
    try {
      let txHash: Hash | undefined;
      // 1. If accepting, call contract to release USDC to borrower
      if (status === "accepted" && address && offer.offererAddress) {
        if (!l.contractListingId) throw new Error("Listing is pending chain sync. Try again after the listing transaction is confirmed.");
        const aprBps = Math.round(offer.apr * 100);
        txHash = await waitForTx(await writeAcceptOffer(
          address as Address,
          BigInt(l.contractListingId),
          offer.offererAddress as Address,
          parseUnits(offer.amt.toFixed(4), 6),
          aprBps,
          offer.term,
        ));
      }

      // 2. Update API
      const res = await fetch("/api/offers", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, actorAddress: address, txHash }),
      });
      if (!res.ok) throw new Error("Unable to update offer");
      setOffers((current) => current.map((o) => o.id === id ? { ...o, status } : o));
      if (status === "accepted") {
        setLoan((prev) => prev ? { ...prev, status: "funded" as Loan["status"] } : prev);
      }
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setOfferAction("");
    }
  };
  const exportCalendar = () => {
    const start = new Date();
    const due = new Date(start.getTime() + l.term * 24 * 60 * 60 * 1000);
    const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Vault//Repayment//EN",
      "BEGIN:VEVENT",
      `UID:${l.id}@vault`,
      `DTSTAMP:${stamp(start)}`,
      `DTSTART:${stamp(due)}`,
      `SUMMARY:Vault repayment due for ${l.id}`,
      `DESCRIPTION:Repay ${repaymentDue.toFixed(3)} USDC to avoid collateral transfer.`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `vault-${l.id}-repayment.ics`;
    link.click();
    URL.revokeObjectURL(href);
  };

  const repayLoan = async () => {
    if (!address || !loan) return;
    setRepaying(true);
    try {
      if (!l.contractListingId) throw new Error("Listing is pending chain sync. Try again after the listing transaction is confirmed.");
      const totalDueWei = parseUnits(repaymentDue.toFixed(4), 6);
      await waitForTx(await writeApproveUsdc(address as Address, getEscrowAddress(), totalDueWei));
      await waitForTx(await writeRepay(
        address as Address,
        BigInt(l.contractListingId),
        totalDueWei,
      ));
      setLoan((prev) => prev ? { ...prev, status: "repaid" as Loan["status"] } : prev);
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setRepaying(false);
    }
  };

  const repayPartialLoan = async () => {
    if (!address || !loan || !partialAmt) return;
    setRepayingPartial(true);
    try {
      if (!l.contractListingId) throw new Error("Listing is pending chain sync.");
      const partialWei = parseUnits(partialAmt, 6);
      await waitForTx(await writeApproveUsdc(address as Address, getEscrowAddress(), partialWei));
      await waitForTx(await writeRepayPartial(
        address as Address,
        BigInt(l.contractListingId),
        partialWei,
      ));
      setPartialAmt("");
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setRepayingPartial(false);
    }
  };

  const cancelListingAction = async () => {
    if (!address || !loan) return;
    setRepaying(true);
    try {
      if (!l.contractListingId) throw new Error("Listing is pending chain sync.");
      await waitForTx(await writeCancelListing(address as Address, BigInt(l.contractListingId)));
      setLoan((prev) => prev ? { ...prev, status: "cancelled" as Loan["status"] } : prev);
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setRepaying(false);
    }
  };

  const withdrawOfferAction = async (offerId: string) => {
    if (!address || !loan) return;
    setOfferAction(offerId);
    try {
      if (!l.contractListingId) throw new Error("Listing is pending chain sync.");
      await waitForTx(await writeWithdrawOffer(address as Address, BigInt(l.contractListingId)));
      await fetch("/api/offers", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: offerId, status: "rejected", actorAddress: address }),
      });
      setOffers((current) => current.map((o) => o.id === offerId ? { ...o, status: "withdrawn" } : o));
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setOfferAction("");
    }
  };

  const claimDefaultedNft = async () => {
    if (!address || !loan) return;
    setClaiming(true);
    try {
      if (!l.contractListingId) throw new Error("Listing is pending chain sync. Try again after the listing transaction is confirmed.");
      await waitForTx(await writeClaimCollateral(
        address as Address,
        BigInt(l.contractListingId),
      ));
      setLoan((prev) => prev ? { ...prev, status: "default" as Loan["status"] } : prev);
    } catch (err) {
      alert(parseContractError(err));
    } finally {
      setClaiming(false);
    }
  };

  const isBorrower = isSeller;
  const isLender = offers.some((o) => o.status === "accepted" && o.offererAddress?.toLowerCase() === address?.toLowerCase());
  const isFunded = l.status === "funded";
  const isRepaid = l.status === "repaid";
  const isDefaulted = l.status === "default";

  const deadlinePassed = deadline !== null && now > 0 && now >= deadline;
  const msLeft = deadline !== null && now > 0 ? Math.max(0, deadline - now) : 0;
  const daysLeft = Math.floor(msLeft / 86400000);
  const hoursLeft = Math.floor((msLeft % 86400000) / 3600000);
  const minsLeft = Math.floor((msLeft % 3600000) / 60000);
  const secsLeft = Math.floor((msLeft % 60000) / 1000);
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const elapsedDays = deadline !== null && now > 0 ? Math.max(0, (now - (deadline - l.term * 86400000)) / 86400000) : 0;
  const proRatedInterest = l.amt * (l.apr / 100) * Math.min(elapsedDays, l.term) / 365;
  const fullInterest = l.amt * (l.apr / 100) * l.term / 365;
  const repaymentDue = deadlinePassed ? l.amt + fullInterest : l.amt + proRatedInterest;

  return (
    <main id="main-content" role="main" aria-label="Main content" className="main">
      <div className="row" style={{ marginBottom: 14, gap: 8, fontSize: 12, color: "var(--ink-4)" }}>
        <Link href="/market" className="btn ghost sm">← Back</Link>
        <span>Lend & Borrow</span><span>/</span><span className="mono" style={{ color: "var(--ink-2)" }}>{l.id}</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr", gap: 28 }}>
        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 18, display: "grid", gridTemplateColumns: "180px 1fr", gap: 18 }}>
            <div style={{ borderRadius: 10, overflow: "hidden" }}>
              {l.imageUrl ? (
                <img src={l.imageUrl} alt={`${collectionName} ${l.token}`} style={{ width: "100%", height: "100%", objectFit: "cover", aspectRatio: "1" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <NFTArt seed={l.coll} label={l.token} />
              )}
            </div>
            <div className="col" style={{ gap: 6 }}>
              <div className="eyebrow">Collateral</div>
              <h2 className="h2" style={{ margin: 0 }}>{collectionName} <span className="mono" style={{ color: "var(--ink-3)", fontSize: 22 }}>{l.token}</span></h2>
              <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                <StatusPill s={l.status} />
                <span className="pill gold"><span className="pdot" />Verified</span>
                <span className="pill"><span className="pdot" /><span className="nowrap">Floor {fmtETH(l.value)} Ξ</span></span>
              </div>
              <div className="row" style={{ marginTop: 14, gap: 18 }}>
                <div className="col" style={{ gap: 1 }}><span className="smallcaps">Borrower</span><span className="mono" style={{ fontSize: 13 }}>{l.borrower}</span></div>
                <div className="col" style={{ gap: 1 }}><span className="smallcaps">Offers</span><span className="mono" style={{ fontSize: 13 }}>{offers.length}</span></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="row" style={{ borderBottom: "1px solid var(--line)", overflowX: "auto" }}>
              {[["offers", "Offers"], ["history", "History"], ["terms", "Terms"]].map(([k, t]) => (
                <button key={k} className={"side-link" + (tab === k ? " active" : "")} onClick={() => setTab(k)}
                  style={{ borderRadius: 0, border: 0, borderBottom: tab === k ? "2px solid var(--accent)" : "2px solid transparent", flex: "1 0 auto", padding: "12px 14px", margin: 0, color: tab === k ? "var(--ink)" : "var(--ink-3)", background: "transparent", whiteSpace: "nowrap", fontSize: 13 }}>{t}</button>
              ))}
            </div>
            {tab === "offers" && (
              <div style={{ padding: "8px 18px 14px" }}>
                {offers.length === 0 && <div className="muted" style={{ padding: 24, textAlign: "center" }}>No offers yet. Signed counter-offers will appear here.</div>}
                {offers.map((o) => (
                  <div key={o.id} className="offer-row">
                    <div className="avatar">{o.who.slice(2, 4)}</div>
                    <div className="col" style={{ gap: 2 }}>
                      <span className="mono" style={{ fontSize: 13 }}>{o.who}</span>
                      <span className="muted-2" style={{ fontSize: 11 }}>{new Date(o.when).toLocaleString()}</span>
                    </div>
                    <div className="col right" style={{ gap: 1 }}>
                      <span className="mono" style={{ fontSize: 13 }}>{fmtETH(o.amt)} USDC · {o.apr}% · {o.term}d</span>
                      <span className="muted-2" style={{ fontSize: 11, textTransform: "capitalize" }}>{o.status}</span>
                    </div>
                    {isSeller ? (
                      <div className="row" style={{ gap: 6 }}>
                        <button className="btn sm primary" onClick={() => updateOfferStatus(o.id, "accepted", o)} disabled={o.status !== "pending" || offerAction === o.id}>Accept</button>
                        <button className="btn sm danger" onClick={() => updateOfferStatus(o.id, "rejected", o)} disabled={o.status !== "pending" || offerAction === o.id}>Reject</button>
                      </div>
                    ) : o.offererAddress?.toLowerCase() === address?.toLowerCase() && o.status === "pending" ? (
                      <div className="row" style={{ gap: 6 }}>
                        <button className="btn sm danger" onClick={() => withdrawOfferAction(o.id)} disabled={offerAction === o.id}>Withdraw</button>
                      </div>
                    ) : (
                      <div className="row" style={{ gap: 6 }}>
                        <button className="btn sm" disabled={o.status !== "pending" || matching === o.id} onClick={() => submitMatch(o)}>{matching === o.id ? "…" : "Match"}</button>
                        <button className="btn sm" disabled={o.status !== "pending"} onClick={() => { setMatchOffer({ amt: o.amt, apr: Number((o.apr - 0.5).toFixed(1)), term: o.term }); setModal("counter"); }}>Counter</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {tab === "history" && (
              <div style={{ padding: 18 }}>
                <table className="tbl"><thead><tr><th>Tx</th><th>Type</th><th>From</th><th className="right">Value</th><th className="right">When</th></tr></thead>
                  <tbody>
                    {offers.length === 0 ? (
                      <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 24 }}>No ledger activity recorded for this listing yet.</td></tr>
                    ) : offers.map((offer) => (
                      <tr key={offer.id}><td className="mono">{offer.id}</td><td>Offer</td><td className="mono">{offer.who}</td><td className="right mono">{offer.amt} USDC</td><td className="right muted">{new Date(offer.when).toLocaleString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {tab === "terms" && (
              <div style={{ padding: 18 }}>
                <p className="muted" style={{ marginTop: 0, fontSize: 13, lineHeight: 1.6 }}>
                  Standard NFT-loan terms. If the borrower defaults, the NFT is transferred to the lender. Platform fee is 1.5% of the loan principal at origination.
                </p>
                <div className="col" style={{ gap: 10, marginTop: 16 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn sm" style={{ width: "fit-content" }} onClick={exportCalendar}>
                      <Icon.clock style={{ width: 12, height: 12 }} /> Export repayment calendar
                    </button>
                    <button className="btn sm" style={{ width: "fit-content" }} onClick={() => shareAsCast(
                      `${collectionName} ${l.token} — ${l.amt} USDC at ${l.apr}% APR on Vault`,
                      `${window.location.origin}/detail?id=${l.id}`
                    )}>
                      <Icon.cast style={{ width: 12, height: 12 }} /> Share
                    </button>
                  </div>
                  <div className="muted-2" style={{ fontSize: 12 }}>
                    On-chain escrow link appears after deployment records a contract address.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow">Loan terms</div>
            <div className="kv"><span className="k">Principal</span><span className="v big">{fmtETH(l.amt)} USDC</span></div>
            <div className="kv"><span className="k">Interest ({l.apr}% APR)</span><span className="v">+ {proRatedInterest.toFixed(3)} USDC</span></div>
            <div className="kv"><span className="k">Repayment due</span><span className="v">{repaymentDue.toFixed(3)} USDC {deadlinePassed ? <span style={{ color: "var(--risk)", fontSize: 11 }}>(overdue)</span> : ""}</span></div>
            <div className="kv"><span className="k">Term</span><span className="v">{l.term} days</span></div>
            <div className="kv"><span className="k">Loan-to-value</span><span className="v">{l.ltv}%</span></div>
            <div className="kv"><span className="k">Platform fee</span><span className="v">1.5% · {(l.amt * 0.015).toFixed(3)} USDC</span></div>
            <div className="kv"><span className="k">Escrow</span><span className="v" style={{ color: "var(--accent)" }}>baseshire.eth · EOA</span></div>

            <div className="row" style={{ gap: 8, marginTop: 18 }}>
              {!isFunded && !isBorrower && (
                <button className="btn primary lg" style={{ flex: 1 }} onClick={() => { setMatchOffer(null); setModal("counter"); }}>Submit offer</button>
              )}
              {!isFunded && isBorrower && (
                <button className="btn danger lg" style={{ flex: 1 }} onClick={cancelListingAction} disabled={repaying}>
                  {repaying ? "Cancelling…" : "Cancel listing"}
                </button>
              )}
              {isFunded && isBorrower && !deadlinePassed && (
                <div className="col" style={{ gap: 8, flex: 1 }}>
                  <button className="btn primary lg" style={{ width: "100%" }} onClick={repayLoan} disabled={repaying}>
                    {repaying ? "Repaying…" : `Repay ${repaymentDue.toFixed(3)} USDC`}
                  </button>
                  <div className="row" style={{ gap: 6 }}>
                    <input className="input mono" style={{ flex: 1, height: 36, fontSize: 13 }} type="number" step="0.001" placeholder="Partial amount (USDC)" value={partialAmt} onChange={e => setPartialAmt(e.target.value)} />
                    <button className="btn sm" onClick={repayPartialLoan} disabled={repayingPartial || !partialAmt}>
                      {repayingPartial ? "…" : "Partial"}
                    </button>
                  </div>
                </div>
              )}
              {isFunded && isBorrower && deadlinePassed && (
                <div className="col" style={{ gap: 8, flex: 1 }}>
                  <button className="btn danger lg" style={{ width: "100%" }} onClick={repayLoan} disabled={repaying}>
                    {repaying ? "Repaying…" : `Repay ${repaymentDue.toFixed(3)} USDC (overdue)`}
                  </button>
                  <div className="muted-2" style={{ fontSize: 11, textAlign: "center" }}>Deadline passed. Lender can claim your NFT at any time.</div>
                </div>
              )}
              {isFunded && isLender && (
                <button className={"btn lg" + (deadlinePassed ? " danger" : "")} style={{ flex: 1 }} onClick={claimDefaultedNft} disabled={claiming}>
                  {claiming ? "Claiming…" : deadlinePassed ? "Claim collateral now" : `Claimable in ${daysLeft}d ${hoursLeft}h`}
                </button>
              )}
            </div>
            <div className="muted-2" style={{ fontSize: 11.5, marginTop: 10, textAlign: "center" }}>
              {!isFunded
                ? `NFT is locked in escrow. Borrower receives ${fmtETH(l.amt)} USDC only when they accept an offer.`
                : isRepaid ? "Loan repaid. NFT returned to borrower."
                : isDefaulted ? "Loan defaulted. NFT claimed by lender."
                : deadlinePassed && isBorrower
                  ? "Deadline passed. Repay immediately or lender can claim your NFT."
                  : isBorrower
                    ? "Repay the loan to reclaim your NFT."
                    : deadlinePassed
                      ? "Deadline passed. You can now claim the NFT collateral."
                      : `Claimable in ${daysLeft}d ${hoursLeft}h. Lender can claim collateral if borrower defaults.`}
            </div>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <span className="eyebrow">{deadlinePassed ? "Default countdown — OVERDUE" : isRepaid ? "Loan closed" : isDefaulted ? "Loan closed" : "Default countdown"}</span>
              {deadlinePassed ? (
                <span className="pill danger"><span className="pdot" />Overdue</span>
              ) : isRepaid ? (
                <span className="pill success"><span className="pdot" />Repaid</span>
              ) : isDefaulted ? (
                <span className="pill danger"><span className="pdot" />Defaulted</span>
              ) : deadline !== null ? (
                <span className="pill warn"><span className="pdot" />{daysLeft}d {hoursLeft}h left</span>
              ) : (
                <span className="pill warn"><span className="pdot" />{l.term} days</span>
              )}
            </div>
            {isRepaid ? (
              <div className="display-num" style={{ fontSize: 38, color: "var(--go)" }}>Repaid ✓</div>
            ) : isDefaulted ? (
              <div className="display-num" style={{ fontSize: 38, color: "var(--risk)" }}>Defaulted</div>
            ) : deadline !== null ? (
              <div className="display-num" style={{ fontSize: 38, color: deadlinePassed ? "var(--risk)" : "var(--ink)" }}>
                {deadlinePassed ? "-" : ""}{daysLeft}<span className="muted-2" style={{ fontSize: 18 }}>d</span>{" "}
                {hoursLeft}<span className="muted-2" style={{ fontSize: 18 }}>h</span>{" "}
                {minsLeft}<span className="muted-2" style={{ fontSize: 18 }}>m</span>{" "}
                <span className="muted-2" style={{ fontSize: 14 }}>{secsLeft}s</span>
              </div>
            ) : (
              <div className="display-num" style={{ fontSize: 38, color: "var(--ink)" }}>{l.term}<span className="muted-2" style={{ fontSize: 18 }}>d</span></div>
            )}
            <hr className="hr" style={{ margin: "16px 0" }} />
            <div className="tline">
              <div className="ev done"><div className="ttl">NFT locked in escrow</div><div className="sub">{l.contractListingId ? "On-chain synced" : "Pending sync"}</div></div>
              <div className="ev done"><div className="ttl">Loan funded · {fmtETH(l.amt)} USDC to borrower</div><div className="sub">{isFunded || isRepaid || isDefaulted ? "Funded" : "Awaiting lender"}</div></div>
              {deadlinePassed ? (
                <div className="ev now" style={{ color: "var(--risk)" }}><div className="ttl">Deadline passed</div><div className="sub">{deadline ? formatDate(deadline) : ""}</div></div>
              ) : (
                <div className="ev now"><div className="ttl">Active — accruing interest</div><div className="sub">{proRatedInterest.toFixed(3)} USDC accrued · {l.apr}% APR</div></div>
              )}
              <div className="ev"><div className="ttl">Repayment due</div><div className="sub">{deadline !== null ? formatDate(deadline) : `${l.term} days`}</div></div>
            </div>
          </div>
        </div>
      </div>

      {modal === "counter" && <CounterOfferModal onClose={() => { setModal(null); setMatchOffer(null); }} l={l} prefillAmt={matchOffer?.amt} prefillApr={matchOffer?.apr} prefillTerm={matchOffer?.term} />}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main id="main-content" role="main" aria-label="Main content" className="main"><div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading…</div></main>}>
      <LoanDetailContent />
    </Suspense>
  );
}
