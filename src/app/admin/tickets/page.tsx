"use client";

import React, { useEffect, useState } from "react";

type Ticket = {
  id: string;
  from: string;
  subj: string;
  body: string;
  priority: string;
  category: string;
  unread: boolean;
  status: string;
  updatedAt: string;
};

export default function AdminTicketsPage() {
  const [selected, setSelected] = useState(0);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const t = tickets[selected];

  const load = () => {
    fetch("/api/admin/tickets")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load tickets");
        return json;
      })
      .then((json) => setTickets(json.data || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load tickets"));
  };

  useEffect(load, []);

  const updateTicket = async (status: "open" | "pending" | "resolved") => {
    if (!t) return;
    const res = await fetch("/api/admin/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, status, reply: reply || undefined }),
    });
    if (res.ok) {
      setReply("");
      load();
    }
  };

  return (
    <main id="main-content" role="main" aria-label="Main content" className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">Support Inbox</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Triage, respond, escalate.</h1>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="metric"><span className="lab">Open</span><span className="val">{tickets.filter(x => x.status !== "resolved").length}</span></div>
        <div className="metric"><span className="lab">Unread</span><span className="val" style={{ color: "var(--risk)" }}>{tickets.filter(x => x.unread).length}</span></div>
        <div className="metric"><span className="lab">Resolved</span><span className="val">{tickets.filter(x => x.status === "resolved").length}</span></div>
      </div>

      {error && <div className="warn-banner" style={{ marginBottom: 16 }}>{error}</div>}
      <div className="grid" style={{ gridTemplateColumns: "320px 1fr", gap: 14 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden", maxHeight: 560, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>
            <input className="input" placeholder="Search tickets…" aria-label="Search tickets" style={{ height: 30 }} />
          </div>
          <div className="col" style={{ overflowY: "auto", flex: 1 }}>
            {tickets.length === 0 && <div className="muted" style={{ padding: 18, textAlign: "center" }}>No live tickets.</div>}
            {tickets.map((tk, i) => (
              <button key={tk.id} className="row" onClick={() => setSelected(i)} style={{
                padding: "12px 14px", gap: 10,
                background: selected === i ? "var(--surface-2)" : "transparent",
                border: 0, borderBottom: "1px solid var(--line)",
                color: "inherit", textAlign: "left", cursor: "pointer", alignItems: "flex-start",
              }}>
                {tk.unread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--risk)", marginTop: 6, flexShrink: 0 }} />}
                <div className="col" style={{ gap: 2, flex: 1, minWidth: 0, marginLeft: tk.unread ? 0 : 16 }}>
                  <div className="row between"><span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{tk.id}</span><span className="muted-2" style={{ fontSize: 10.5 }}>{new Date(tk.updatedAt).toLocaleDateString()}</span></div>
                  <span className="mono" style={{ fontSize: 12 }}>{tk.from}</span>
                  <span style={{ fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.subj}</span>
                  <div className="row" style={{ gap: 6, marginTop: 4 }}>
                    <span className="pill" style={{ fontSize: 10, padding: "1px 6px" }}>{tk.priority}</span>
                    <span className="pill" style={{ fontSize: 10, padding: "1px 6px" }}>{tk.category}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", maxHeight: 560 }}>
          {!t ? (
            <div className="muted" style={{ padding: 40, textAlign: "center" }}>Select a live ticket.</div>
          ) : (
            <>
              <div className="row between" style={{ marginBottom: 14 }}>
                <div className="col" style={{ gap: 2 }}>
                  <span className="mono" style={{ fontSize: 13, color: "var(--ink)" }}>{t.from}</span>
                  <span className="mono muted-2" style={{ fontSize: 11 }}>{t.id} · {new Date(t.updatedAt).toLocaleString()}</span>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="pill warn">{t.priority}</span>
                  <span className="pill">{t.category}</span>
                </div>
              </div>
              <h3 className="serif" style={{ fontSize: 20, margin: "0 0 14px" }}>{t.subj}</h3>
              <div style={{ flex: 1, overflowY: "auto", borderTop: "1px solid var(--line)", paddingTop: 14, marginBottom: 14 }}>
                <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{t.body || "No ticket body was provided."}</p>
              </div>
              <div className="row" style={{ gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                <input className="input" placeholder="Reply…" aria-label="Reply to ticket" style={{ flex: 1 }} value={reply} onChange={(e) => setReply(e.target.value)} />
                <button className="btn primary" onClick={() => updateTicket("pending")}>Send</button>
                <button className="btn" onClick={() => updateTicket("resolved")}>Resolve</button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
