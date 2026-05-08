"use client";

import React, { useState } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import { DIGITAL_DEALS } from "@/lib/data";
import { fmtUSD } from "@/lib/utils";

const checks = [
  { t: "Token revenue rights — receiver address", done: true },
  { t: "Tx-fee receiver contract role", done: true },
  { t: "X account · 48k followers", done: true },
  { t: "Farcaster FID 8210 transfer", done: true },
  { t: "Domain · fed.fi · DNS update", done: false, active: true },
  { t: "Telegram · 11k members", done: false },
  { t: "Smart-contract owner role", done: false },
];

export default function DealRoomPage() {
  const d = DIGITAL_DEALS[0];
  const [step, setStep] = useState(2);
  const [draft, setDraft] = useState("");
  const [chat, setChat] = useState([
    { who: "Seller · 0xfa12…0011", text: "All deliverables uploaded. Treasury wallet ownership transferred to your address. Verifying.", t: "14:08", me: false },
    { who: "You", text: "Confirmed receipt of FID, Telegram channel, and contract owner role. Domain DNS still pointing to old NS.", t: "14:11", me: true },
    { who: "Seller · 0xfa12…0011", text: "Updating now — new NS records pushed. Should propagate in ~10m.", t: "14:13", me: false },
  ]);

  const sendMsg = () => {
    if (!draft.trim()) return;
    setChat((c) => [...c, { who: "You", text: draft, t: "now", me: true }]);
    setDraft("");
  };

  const steps = ["Buyer deposits", "Seller transfers", "Buyer confirms", "Funds release", "Fee deducted"];

  return (
    <main className="main">
      <div className="row" style={{ marginBottom: 14, gap: 8, fontSize: 12, color: "var(--ink-4)" }}>
        <Link href="/escrow" className="btn ghost sm">← Back</Link>
        <span>Escrow Center</span><span>/</span><span className="mono" style={{ color: "var(--ink-2)" }}>E-9929</span>
      </div>

      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="eyebrow">Deal Room · Asset Sale</div>
          <h1 className="h2" style={{ marginTop: 8 }}>{d.name} <span className="muted-2 mono" style={{ fontSize: 18 }}>· Full bundle</span></h1>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn ghost"><Icon.warn /> Open dispute</button>
          <button className="btn">Download contract</button>
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
              <div>
                <div className="eyebrow">Asset Overview</div>
                <h3 className="serif" style={{ fontSize: 22, margin: "8px 0" }}>$FED Chain · Full Project Takeover</h3>
              </div>
              <span className="pill gold"><span className="pdot" />Verified seller</span>
            </div>
            <div className="grid grid-3" style={{ marginTop: 12 }}>
              <div className="metric"><span className="lab">Asking</span><span className="val">{d.price} Ξ</span><span className="delta">≈ {fmtUSD(d.price * 3450)}</span></div>
              <div className="metric"><span className="lab">Monthly fees</span><span className="val">{d.mrr} Ξ</span><span className="delta">last 30d, on-chain verified</span></div>
              <div className="metric"><span className="lab">Chain</span><span className="val" style={{ fontSize: 16 }}>Base</span><span className="delta">contract verified</span></div>
            </div>
            <hr className="hr" style={{ margin: "18px 0" }} />
            <div className="eyebrow" style={{ marginBottom: 10 }}>Deliverables checklist</div>
            <div>
              {checks.map((c, i) => (
                <div key={i} className={"check" + (c.done ? " done" : "")}>
                  <span className="box">{c.done && <Icon.check style={{ width: 12, height: 12 }} />}</span>
                  <div className="col" style={{ flex: 1, gap: 1 }}>
                    <span style={{ color: c.done ? "var(--ink)" : "var(--ink-2)" }}>{c.t}</span>
                    {c.active && <span className="muted-2" style={{ fontSize: 11 }}>Buyer needs to confirm receipt</span>}
                  </div>
                  {c.active && <button className="btn primary sm">Confirm</button>}
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Ownership proof</div>
            <div className="grid grid-2">
              {[
                ["Twitter · @fedchain", "Signed message · ✓"],
                ["Farcaster · FID 8210", "Cast signature · ✓"],
                ["Domain fed.fi", "DNS TXT record · ✓"],
                ["Smart contract", "0x4f3a…b210 · owner() · ✓"],
              ].map(([k, v]) => (
                <div key={k} className="row between" style={{ padding: "10px 0", borderBottom: "1px dashed var(--line)" }}>
                  <span style={{ fontSize: 13 }}>{k}</span>
                  <span className="mono muted" style={{ fontSize: 12 }}>{v}</span>
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
            <div className="row" style={{ gap: 8, marginTop: 16 }}>
              <button className="btn primary" style={{ flex: 1 }} onClick={() => setStep(Math.min(4, step + 1))}>Confirm receipt · advance</button>
              <button className="btn danger">Dispute</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
