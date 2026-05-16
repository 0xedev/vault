"use client";

import React, { useState, useEffect } from "react";
import type { Escrow } from "@/lib/data";
import { fmtETH } from "@/lib/utils";
import StatusPill from "@/components/StatusPill";
import Icon from "@/components/icons";

export default function PortfolioPage() {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/escrows")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load portfolio");
        return json;
      }).then((j) => { setEscrows(j.data || []); setLoading(false); })
      .catch((err) => { setError(err instanceof Error ? err.message : "Unable to load portfolio"); setLoading(false); });
  }, []);

  const locked = escrows.reduce((sum, escrow) => sum + escrow.amount, 0);
  const released = escrows.filter((escrow) => escrow.stage === "Released").length;

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div className="eyebrow">Portfolio</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Your active positions.</h1>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="metric"><span className="lab">Total value</span><span className="val">{fmtETH(locked)} Ξ</span><span className="delta">locked in live escrows</span></div>
        <div className="metric"><span className="lab">Active deals</span><span className="val">{escrows.filter((escrow) => escrow.stage !== "Released" && escrow.stage !== "Refunded").length}</span><span className="delta">current positions</span></div>
        <div className="metric"><span className="lab">In escrow</span><span className="val">{fmtETH(locked)} Ξ</span><span className="delta">across {escrows.length} deals</span></div>
        <div className="metric"><span className="lab">Completed</span><span className="val">{released}</span><span className="delta">released escrows</span></div>
      </div>

      {loading ? <div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading…</div> : error ? <div className="warn-banner" style={{ padding: 18 }}>{error}</div> : (
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr>
            <th>ID</th><th>Type</th><th>Asset</th><th>Counterparty</th><th className="right">Amount</th><th>Stage</th><th>Deadline</th><th></th>
          </tr></thead>
          <tbody>
            {escrows.slice(0, 6).map(e => (
              <tr key={e.id}>
                <td className="mono" style={{ color: "var(--ink)" }}>{e.id}</td>
                <td>{e.kind}</td>
                <td>{e.asset}</td>
                <td className="mono">{e.party}</td>
                <td className="right mono">{fmtETH(e.amount)} {e.asset_type}</td>
                <td><StatusPill s={e.stage} /></td>
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
