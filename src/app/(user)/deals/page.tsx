"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import { useRole } from "@/components/RoleProvider";
import { fmtUSD } from "@/lib/utils";
import type { DigitalDeal } from "@/lib/data";

export default function DealRoomPage() {
  const [deal, setDeal] = useState<DigitalDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState(2);
  const [draft, setDraft] = useState("");
  const { role } = useRole();
  const [chat, setChat] = useState<{ who: string; text: string; t: string; me: boolean }[]>([]);
  const [actionNotice, setActionNotice] = useState("");

  useEffect(() => {
    fetch("/api/deals")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load deal room");
        return json;
      })
      .then((json) => {
        setDeal(json.data?.[0] || null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load deal room");
        setLoading(false);
      });
  }, []);

  const sendMsg = () => {
    if (!draft.trim()) return;
    setChat((c) => [...c, { who: "You", text: draft, t: "now", me: true }]);
    setDraft("");
  };

  if (loading) return <main className="main"><div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading…</div></main>;
  if (error) return <main className="main"><div className="warn-banner" style={{ margin: 80 }}>{error}</div></main>;
  if (!deal) return <main className="main"><div className="muted" style={{ padding: 80, textAlign: "center" }}>Deal not found.</div></main>;

  const d = deal;
  const steps = ["Buyer deposits", "Seller transfers", "Buyer confirms", "Funds release", "Fee deducted"];

  const checks = d.includes.map((item, index) => ({ t: item, done: index < step, active: index === step }));
  const canRelease = checks.length > 0 && checks.every((check) => check.done);

  return (
    <main className="main">
      <div className="row" style={{ marginBottom: 14, gap: 8, fontSize: 12, color: "var(--ink-4)" }}>
        <Link href="/escrow" className="btn ghost sm">← Back</Link>
        <span>Escrow Center</span><span>/</span><span className="mono" style={{ color: "var(--ink-2)" }}>E-9929</span>
      </div>

      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="eyebrow">Deal Room · Asset Sale</div>
          <h1 className="h2" style={{ marginTop: 8 }}>{d.name} <span className="muted-2 mono" style={{ fontSize: 18 }}>· {d.type}</span></h1>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <Link className="btn ghost" href="/escrow"><Icon.warn /> Open dispute</Link>
          <button className="btn" onClick={() => window.open("/contracts/VaultEscrow.sol", "_blank")}>Download contract</button>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 18 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <span className="eyebrow">Escrow Timeline</span>
          <span className="muted" style={{ fontSize: 12 }}>Step {step + 1} of 5</span>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div className={"step" + (i < step ? " done" : i === step ? " active" : "")}>
                <span className="num">{i < step ? "✓" : i + 1}</span>
                <span>{s}</span>
              </div>
              {i < 4 && <div className="ln" style={{ flex: 1, height: 1, background: i < step ? "var(--accent)" : "var(--line)", margin: "0 14px" }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 22 }}>
            <div className="row between">
              <div><div className="eyebrow">Asset Overview</div><h3 className="serif" style={{ fontSize: 22, margin: "8px 0" }}>{d.name}</h3></div>
              <span className="pill gold"><span className="pdot" />Verified seller</span>
            </div>
            <div className="grid grid-3" style={{ marginTop: 12 }}>
              <div className="metric"><span className="lab">Asking</span><span className="val">{d.price} Ξ</span><span className="delta">≈ {fmtUSD(d.price * 3450)}</span></div>
              <div className="metric"><span className="lab">Monthly fees</span><span className="val">{d.mrr} Ξ</span><span className="delta">last 30d, on-chain verified</span></div>
              <div className="metric"><span className="lab">Chain</span><span className="val" style={{ fontSize: 16 }}>{d.chain}</span><span className="delta">contract verified</span></div>
            </div>
            <hr className="hr" style={{ margin: "18px 0" }} />
            <div className="eyebrow" style={{ marginBottom: 10 }}>Deliverables checklist</div>
            <div>
              {checks.length === 0 && <div className="muted" style={{ padding: 18, textAlign: "center" }}>No deliverables have been attached to this deal yet.</div>}
              {checks.map((c, i) => (
                <div key={i} className={"check" + (c.done ? " done" : "")}>
                  <span className="box">{c.done && <Icon.check style={{ width: 12, height: 12 }} />}</span>
                  <div className="col" style={{ flex: 1, gap: 1 }}>
                    <span style={{ color: c.done ? "var(--ink)" : "var(--ink-2)" }}>{c.t}</span>
                    {c.active && <span className="muted-2" style={{ fontSize: 11 }}>{role === "buyer" ? "Buyer needs to confirm receipt" : "Waiting for buyer confirmation"}</span>}
                  </div>
                  {c.active && role === "buyer" && <button className="btn primary sm" onClick={() => setStep(Math.min(4, step + 1))}>Confirm</button>}
                  {!c.done && role === "seller" && <button className="btn sm ghost" disabled title="Proof upload API is not connected yet">Proof pending</button>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", height: 480 }}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Deal Room Chat</span>
              <span className="muted-2" style={{ fontSize: 11 }}>End-to-end encrypted · 3 participants</span>
            </div>
            <div className="col" style={{ flex: 1, overflowY: "auto", gap: 8, padding: "4px 0" }}>
              {chat.map((m, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.me ? "flex-end" : "flex-start" }}>
                  <div className={"bubble" + (m.me ? " me" : "")}>
                    <div className="who">{m.who} · {m.t}</div>
                    {m.text}
                  </div>
                </div>
              ))}
              {chat.length === 0 && <div className="muted" style={{ padding: 20, textAlign: "center", fontSize: 12 }}>No persisted deal messages yet. Messages you send are local to this browser session until the messaging backend is connected.</div>}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <input className="input" placeholder="Send a message…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMsg()} />
              <button className="btn primary" onClick={sendMsg}><Icon.send /></button>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Funds in escrow</div>
            <div className="kv"><span className="k">Buyer deposit</span><span className="v">{d.price} Ξ</span></div>
            <div className="kv"><span className="k">Platform fee (2.5%)</span><span className="v">{(d.price * 0.025).toFixed(2)} Ξ</span></div>
            <div className="kv"><span className="k">Net to seller</span><span className="v" style={{ color: "var(--accent)" }}>{(d.price * 0.975).toFixed(2)} Ξ</span></div>
            {actionNotice && <div className="warn-banner" style={{ marginTop: 12, fontSize: 12 }}>{actionNotice}</div>}
            <div className="row" style={{ gap: 8, marginTop: 16 }}>
              {role === "buyer" ? (
                <>
                  <button className="btn primary" style={{ flex: 1 }} onClick={() => setStep(4)} disabled={!canRelease}>Release funds</button>
                  <Link className="btn danger" style={{ flex: 1 }} href="/escrow">Open dispute</Link>
                </>
              ) : (
                <>
                  <button className="btn primary" style={{ flex: 1 }} onClick={() => setActionNotice("Buyer release request queued. Funds can only move after buyer confirmation or admin resolution.")}>Request release</button>
                  <button className="btn danger" style={{ flex: 1 }} onClick={() => setActionNotice("Refund approval requires a live escrow transaction signer before funds can move.")}>Approve refund</button>
                </>
              )}
            </div>
            <div className="muted-2" style={{ fontSize: 11, marginTop: 10, textAlign: "center" }}>
              Funds release is permanent. Only release after verifying all deliverables.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
