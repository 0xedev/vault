"use client";

import React, { useState } from "react";
import { ADMIN_TICKETS } from "@/lib/admin-data";

export default function AdminTicketsPage() {
  const [selected, setSelected] = useState(0);
  const t = ADMIN_TICKETS[selected];

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">Support Inbox</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Triage, respond, escalate.</h1>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="metric"><span className="lab">Open</span><span className="val">{ADMIN_TICKETS.length}</span></div>
        <div className="metric"><span className="lab">Unread</span><span className="val" style={{ color: "var(--risk)" }}>{ADMIN_TICKETS.filter(x => x.unread).length}</span></div>
        <div className="metric"><span className="lab">Median first reply</span><span className="val">32m</span></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "320px 1fr", gap: 14 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden", maxHeight: 560, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>
            <input className="input" placeholder="Search tickets…" style={{ height: 30 }}/>
          </div>
          <div className="col" style={{ overflowY: "auto", flex: 1 }}>
            {ADMIN_TICKETS.map((tk, i) => (
              <button key={tk.id} className="row" onClick={() => setSelected(i)} style={{
                padding: "12px 14px", gap: 10,
                background: selected === i ? "var(--surface-2)" : "transparent",
                border: 0, borderBottom: "1px solid var(--line)",
                color: "inherit", textAlign: "left", cursor: "pointer", alignItems: "flex-start",
              }}>
                {tk.unread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--risk)", marginTop: 6, flexShrink: 0 }}/>}
                <div className="col" style={{ gap: 2, flex: 1, minWidth: 0, marginLeft: tk.unread ? 0 : 16 }}>
                  <div className="row between"><span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{tk.id}</span><span className="muted-2" style={{ fontSize: 10.5 }}>{tk.age}</span></div>
                  <span className="mono" style={{ fontSize: 12 }}>{tk.from}</span>
                  <span style={{ fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.subj}</span>
                  <div className="row" style={{ gap: 6, marginTop: 4 }}>
                    <span className="pill" style={{ fontSize: 10, padding: "1px 6px",
                      background: tk.priority === "urgent" ? "color-mix(in oklab, var(--risk) 14%, transparent)" : tk.priority === "high" ? "color-mix(in oklab, var(--warn) 14%, transparent)" : "var(--surface-2)",
                      color: tk.priority === "urgent" ? "var(--risk)" : tk.priority === "high" ? "var(--warn)" : "var(--ink-3)" }}>{tk.priority}</span>
                    <span className="pill" style={{ fontSize: 10, padding: "1px 6px" }}>{tk.category}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", maxHeight: 560 }}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <div className="col" style={{ gap: 2 }}>
              <span className="mono" style={{ fontSize: 13, color: "var(--ink)" }}>{t.from}</span>
              <span className="mono muted-2" style={{ fontSize: 11 }}>{t.id} · {t.age}</span>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <span className="pill warn">{t.priority}</span>
              <span className="pill">{t.category}</span>
            </div>
          </div>
          <h3 className="serif" style={{ fontSize: 20, margin: "0 0 14px" }}>{t.subj}</h3>
          <div style={{ flex: 1, overflowY: "auto", borderTop: "1px solid var(--line)", paddingTop: 14, marginBottom: 14 }}>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>Full ticket thread would appear here, with message history between the user and support team. Integrates with on-chain evidence and escrow state.</p>
          </div>
          <div className="row" style={{ gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <input className="input" placeholder="Reply…" style={{ flex: 1 }}/>
            <button className="btn primary">Send</button>
            <button className="btn">Resolve</button>
          </div>
        </div>
      </div>
    </main>
  );
}
