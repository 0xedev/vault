"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/icons";
import NFTArt from "@/components/NFTArt";
import StatusPill from "@/components/StatusPill";
import { COLLECTIONS } from "@/lib/data";
import { fmtETH } from "@/lib/utils";
import { useWallet } from "@/components/WalletProvider";
import type { Loan } from "@/lib/data";

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
};

function AcceptLoanModal({ onClose, l }: { onClose: () => void; l: LoanRecord }) {
  const { isConnected, connect, isConnecting, address } = useWallet();
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const repayment = (l.amt * (1 + l.apr / 100 * l.term / 365)).toFixed(3);

  const handleFund = async () => {
    if (!address || !l.sellerAddress) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/escrows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: l.id,
          buyerAddress: address,
          sellerAddress: l.sellerAddress,
          amount: l.amt,
          currency: "ETH",
        }),
      });
      if (!res.ok) throw new Error("Escrow creation failed");
      setDone(true);
    } catch (e) {
      console.error("Escrow creation failed", e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="modal-bg" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-h">
            <h3 className="serif" style={{ margin: 0, fontSize: 22 }}>Connect to lend</h3>
            <button className="btn ghost sm" onClick={onClose}><Icon.x /></button>
          </div>
          <div className="modal-b" style={{ textAlign: "center", padding: "40px 22px" }}>
            <Icon.shield style={{ width: 32, height: 32, color: "var(--accent)" }} />
            <p className="muted" style={{ margin: "12px 0 20px", fontSize: 14 }}>Connect your wallet to fund this loan.</p>
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
          <h3 className="serif" style={{ margin: 0, fontSize: 22 }}>{done ? "Escrow created!" : `Fund loan · ${fmtETH(l.amt)} Ξ`}</h3>
          <button className="btn ghost sm" onClick={onClose}><Icon.x /></button>
        </div>
        <div className="modal-b">
          {done ? (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <Icon.check style={{ width: 36, height: 36, color: "var(--accent)" }} />
              <p style={{ fontSize: 14, margin: "12px 0 4px" }}>{fmtETH(l.amt)} Ξ sent to escrow.</p>
              <p className="muted-2" style={{ fontSize: 12 }}>Track this deal from Escrow Center.</p>
            </div>
          ) : (
            <>
              <div className="warn-banner" style={{ marginBottom: 16 }}>
                <Icon.warn /><div>{fmtETH(l.amt)} Ξ will leave your wallet and be locked in escrow until repayment or default.</div>
              </div>
              <div className="kv"><span className="k">You send</span><span className="v big">{fmtETH(l.amt)} Ξ</span></div>
              <div className="kv"><span className="k">You receive at repayment</span><span className="v" style={{ color: "var(--accent)" }}>{repayment} Ξ</span></div>
              <div className="kv"><span className="k">If borrower defaults</span><span className="v">{l.collection || COLLECTIONS[l.coll] || "Collateral"} {l.token}</span></div>
              <div className="kv"><span className="k">Term</span><span className="v">{l.term} days</span></div>
              <div className="kv"><span className="k">Platform fee</span><span className="v">{(l.amt * 0.015).toFixed(3)} Ξ (1.5%)</span></div>
              <div style={{ marginTop: 16 }}>
                <span className="label">Type &quot;FUND&quot; to confirm</span>
                <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="FUND" />
              </div>
            </>
          )}
        </div>
        {!done && (
          <div className="modal-f">
            <span className="muted-2" style={{ fontSize: 12 }}>Funds go to escrow contract. Repayment releases them.</span>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn primary" disabled={confirm !== "FUND" || submitting || !l.sellerAddress} style={{ opacity: confirm === "FUND" && l.sellerAddress ? 1 : 0.5 }} onClick={handleFund}>{submitting ? "Funding…" : "Sign & fund"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CounterOfferModal({ onClose, l }: { onClose: () => void; l: LoanRecord }) {
  const { isConnected, connect, isConnecting, address } = useWallet();
  const [amt, setAmt] = useState(l.amt * 0.95);
  const [apr, setApr] = useState(l.apr);
  const [term, setTerm] = useState(l.term);
  const [exp, setExp] = useState(24);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!address) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: l.id,
          offererAddress: address,
          amount: amt,
          apr,
          termDays: term,
          expiresInHours: exp,
        }),
      });
      if (!res.ok) throw new Error("Counter submission failed");
      setDone(true);
    } catch (e) {
      console.error("Counter submission failed", e);
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
              <p style={{ fontSize: 14, margin: "12px 0 4px" }}>{fmtETH(amt)} Ξ at {apr}% / {term}d submitted.</p>
              <p className="muted-2" style={{ fontSize: 12 }}>The borrower can now accept, reject, or counter.</p>
            </div>
          ) : (
            <>
              <p className="muted" style={{ marginTop: 0, fontSize: 12, lineHeight: 1.4 }}>
                Listed: {fmtETH(l.amt)} Ξ at {l.apr}% / {l.term}d. Submit your terms.
              </p>
              <div className="grid grid-2" style={{ marginTop: 12, gap: 10 }}>
                <div><span className="label">Amount (Ξ)</span><input className="input mono" type="number" step="0.1" value={amt} onChange={(e) => setAmt(+e.target.value)} /></div>
                <div><span className="label">APR (%)</span><input className="input mono" type="number" step="0.1" value={apr} onChange={(e) => setApr(+e.target.value)} /></div>
                <div><span className="label">Term (days)</span><input className="input mono" type="number" value={term} onChange={(e) => setTerm(+e.target.value)} /></div>
                <div><span className="label">Expires (h)</span><input className="input mono" type="number" value={exp} onChange={(e) => setExp(+e.target.value)} /></div>
              </div>
              <div className="card" style={{ padding: 10, marginTop: 12, background: "var(--surface-2)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div className="col" style={{ gap: 1 }}><span className="smallcaps" style={{ fontSize: 9 }}>Repayment</span><span className="mono" style={{ fontSize: 12 }}>{(amt * (1 + apr / 100 * term / 365)).toFixed(2)} Ξ</span></div>
                <div className="col" style={{ gap: 1 }}><span className="smallcaps" style={{ fontSize: 9 }}>LTV</span><span className="mono" style={{ fontSize: 12 }}>{Math.round(amt / l.value * 100)}%</span></div>
                <div className="col" style={{ gap: 1 }}><span className="smallcaps" style={{ fontSize: 9 }}>Expires</span><span className="mono" style={{ fontSize: 12 }}>{exp}h</span></div>
              </div>
            </>
          )}
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
  const { address } = useWallet();

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

  if (loading) return <main className="main"><div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading…</div></main>;
  if (error) return <main className="main"><div className="warn-banner" style={{ margin: 80 }}>{error}</div></main>;
  if (!loan) return <main className="main"><div className="muted" style={{ padding: 80, textAlign: "center" }}>Listing not found.</div></main>;

  const l = loan;
  const collectionName = l.collection || COLLECTIONS[l.coll] || "Unverified collection";
  const isSeller = Boolean(address && l.sellerAddress && address.toLowerCase() === l.sellerAddress.toLowerCase());
  const updateOfferStatus = async (id: string, status: "accepted" | "rejected") => {
    setOfferAction(id);
    try {
      const res = await fetch("/api/offers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Unable to update offer");
      setOffers((current) => current.map((offer) => offer.id === id ? { ...offer, status } : offer));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update offer");
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
      `DESCRIPTION:Repay ${(l.amt * (1 + l.apr / 100 * l.term / 365)).toFixed(3)} ETH to avoid collateral transfer.`,
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

  return (
    <main className="main">
      <div className="row" style={{ marginBottom: 14, gap: 8, fontSize: 12, color: "var(--ink-4)" }}>
        <Link href="/market" className="btn ghost sm">← Back</Link>
        <span>Lend & Borrow</span><span>/</span><span className="mono" style={{ color: "var(--ink-2)" }}>{l.id}</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr", gap: 28 }}>
        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 18, display: "grid", gridTemplateColumns: "180px 1fr", gap: 18 }}>
            <div style={{ borderRadius: 10, overflow: "hidden" }}>
              <NFTArt seed={l.coll} label={l.token} />
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
                      <span className="mono" style={{ fontSize: 13 }}>{fmtETH(o.amt)} Ξ · {o.apr}% · {o.term}d</span>
                      <span className="muted-2" style={{ fontSize: 11, textTransform: "capitalize" }}>{o.status}</span>
                    </div>
                    {isSeller ? (
                      <div className="row" style={{ gap: 6 }}>
                        <button className="btn sm primary" onClick={() => updateOfferStatus(o.id, "accepted")} disabled={o.status !== "pending" || offerAction === o.id}>Accept</button>
                        <button className="btn sm danger" onClick={() => updateOfferStatus(o.id, "rejected")} disabled={o.status !== "pending" || offerAction === o.id}>Reject</button>
                      </div>
                    ) : (
                      <button className="btn sm" disabled style={{ opacity: 0.45 }}>Seller decides</button>
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
                      <tr key={offer.id}><td className="mono">{offer.id}</td><td>Offer</td><td className="mono">{offer.who}</td><td className="right mono">{offer.amt} Ξ</td><td className="right muted">{new Date(offer.when).toLocaleString()}</td></tr>
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
                  <button className="btn sm" style={{ width: "fit-content" }} onClick={exportCalendar}>
                    <Icon.clock style={{ width: 12, height: 12 }} /> Export repayment calendar
                  </button>
                  <div className="muted-2" style={{ fontSize: 12 }}>
                    On-chain verification link appears after escrow deployment records a contract address.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow">Loan terms</div>
            <div className="kv"><span className="k">Principal</span><span className="v big">{fmtETH(l.amt)} Ξ</span></div>
            <div className="kv"><span className="k">Interest ({l.apr}% APR)</span><span className="v">+ {(l.amt * l.apr / 100 * l.term / 365).toFixed(3)} Ξ</span></div>
            <div className="kv"><span className="k">Repayment due</span><span className="v">{(l.amt * (1 + l.apr / 100 * l.term / 365)).toFixed(3)} Ξ</span></div>
            <div className="kv"><span className="k">Term</span><span className="v">{l.term} days</span></div>
            <div className="kv"><span className="k">Loan-to-value</span><span className="v">{l.ltv}%</span></div>
            <div className="kv"><span className="k">Platform fee</span><span className="v">1.5% · {(l.amt * 0.015).toFixed(3)} Ξ</span></div>
            <div className="kv"><span className="k">Escrow</span><span className="v" style={{ color: "var(--accent)" }}>baseshire.eth · EOA</span></div>

            <div className="row" style={{ gap: 8, marginTop: 18 }}>
              <button className="btn primary lg" style={{ flex: 1 }} onClick={() => setModal("accept")}>Fund this loan · {fmtETH(l.amt)} Ξ</button>
              <button className="btn lg" onClick={() => setModal("counter")}>Counter</button>
            </div>
            <div className="muted-2" style={{ fontSize: 11.5, marginTop: 10, textAlign: "center" }}>
              {fmtETH(l.amt)} Ξ leaves your wallet and is sent to escrow. Funds release on repayment.
            </div>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Default countdown</span>
              <span className="pill warn"><span className="pdot" />{l.term} days</span>
            </div>
            <div className="display-num" style={{ fontSize: 38, color: "var(--ink)" }}>{l.term - 1}<span className="muted-2" style={{ fontSize: 18 }}>d</span> 14<span className="muted-2" style={{ fontSize: 18 }}>h</span> 02<span className="muted-2" style={{ fontSize: 18 }}>m</span></div>
            <hr className="hr" style={{ margin: "16px 0" }} />
            <div className="tline">
              <div className="ev done"><div className="ttl">NFT locked in escrow</div><div className="sub">Apr 1, 14:22</div></div>
              <div className="ev done"><div className="ttl">Loan funded · {fmtETH(l.amt)} Ξ to borrower</div><div className="sub">Apr 1, 14:24</div></div>
              <div className="ev now"><div className="ttl">Active — accruing interest</div><div className="sub">{l.apr}% APR</div></div>
              <div className="ev"><div className="ttl">Repayment due</div><div className="sub">Apr 30, 22:00</div></div>
            </div>
          </div>
        </div>
      </div>

      {modal === "accept" && <AcceptLoanModal onClose={() => setModal(null)} l={l} />}
      {modal === "counter" && <CounterOfferModal onClose={() => setModal(null)} l={l} />}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="main"><div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading…</div></main>}>
      <LoanDetailContent />
    </Suspense>
  );
}
