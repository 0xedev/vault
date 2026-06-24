"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import StatusPill from "@/components/StatusPill";
import type { Escrow } from "@/lib/data";

export default function AdminEscrowPage() {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/escrows")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load escrows");
        return json;
      })
      .then((json) => setEscrows(json.data || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load escrows"));
  }, []);

  const locked = escrows.reduce((sum, escrow) => sum + escrow.amount, 0);
  const needsAction = escrows.filter((escrow) => ["Disputed", "Awaiting confirmation"].includes(escrow.stage)).length;

  return (
    <main id="main-content" role="main" aria-label="Main content" className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">Escrow Operations</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Pause, force-release, refund — multi-sig signed.</h1>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="metric"><span className="lab">Active escrows</span><span className="val">{escrows.length}</span></div>
        <div className="metric"><span className="lab">Total locked</span><span className="val">{locked.toFixed(3)} Ξ</span></div>
        <div className="metric"><span className="lab">Needs action</span><span className="val" style={{ color: "var(--warn)" }}>{needsAction}</span></div>
        <div className="metric"><span className="lab">Auto-release queue</span><span className="val">{escrows.filter((e) => e.stage === "Awaiting confirmation").length}</span></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr><th>ID</th><th>Type</th><th>Counterparty</th><th>Asset</th><th className="right">Locked</th><th>Stage</th><th>Deadline</th><th></th></tr></thead>
          <tbody>
            {error ? (
              <tr><td colSpan={8} className="muted" style={{ textAlign: "center", padding: 24 }}>{error}</td></tr>
            ) : escrows.length === 0 ? (
              <tr><td colSpan={8} className="muted" style={{ textAlign: "center", padding: 24 }}>No live escrows yet.</td></tr>
            ) : escrows.map(e => (
              <tr key={e.id}>
                <td><div className="mono" style={{ color: "var(--ink)" }}>{e.id}</div><div className="muted-2" style={{ fontSize: 11 }}>{e.kind}</div></td>
                <td>{e.kind}</td>
                <td className="mono">{e.party}</td>
                <td>{e.asset}</td>
                <td className="right mono">{e.amount} {e.asset_type}</td>
                <td><StatusPill s={e.stage} /></td>
                <td className="muted">{e.deadline}</td>
                <td className="right">
                  <span className="muted-2" style={{ fontSize: 12 }}>Actions require contract signer</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
