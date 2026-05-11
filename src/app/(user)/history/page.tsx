"use client";

import React, { useState, useEffect } from "react";
import type { Escrow } from "@/lib/data";
import Icon from "@/components/icons";

export default function HistoryPage() {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/escrows")
      .then((r) => r.json()).then((j) => { setEscrows(j.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div className="eyebrow">History</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Transaction history.</h1>
        </div>
      </div>

      {loading ? <div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading…</div> : (
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr>
            <th>ID</th><th>Type</th><th>Asset</th><th className="right">Value</th><th>Counterparty</th><th>Deadline</th><th></th>
          </tr></thead>
          <tbody>
            {escrows.map((e, i) => (
              <tr key={e.id}>
                <td className="mono">{e.id}</td>
                <td>{e.kind}</td>
                <td>{e.asset}</td>
                <td className="right mono">{e.amount} {e.asset_type}</td>
                <td className="mono">{e.party}</td>
                <td className="muted">{e.deadline}</td>
                <td className="right"><Icon.arrow style={{ color: "var(--ink-3)" }}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </main>
  );
}
