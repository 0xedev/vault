"use client";

import { ESCROWS } from "@/lib/data";
import StatusPill from "@/components/StatusPill";

export default function AdminEscrowPage() {
  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">Escrow Operations</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Pause, force-release, refund — multi-sig signed.</h1>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="metric"><span className="lab">Active escrows</span><span className="val">{ESCROWS.length}</span></div>
        <div className="metric"><span className="lab">Total locked</span><span className="val">287.4 Ξ</span></div>
        <div className="metric"><span className="lab">At risk</span><span className="val" style={{ color: "var(--warn)" }}>1</span></div>
        <div className="metric"><span className="lab">Auto-release queue</span><span className="val">4</span></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr><th>ID</th><th>Type</th><th>Counterparty</th><th>Asset</th><th className="right">Locked</th><th>Stage</th><th>Deadline</th><th></th></tr></thead>
          <tbody>
            {ESCROWS.map(e => (
              <tr key={e.id}>
                <td><div className="mono" style={{ color: "var(--ink)" }}>{e.id}</div><div className="muted-2" style={{ fontSize: 11 }}>{e.kind}</div></td>
                <td>{e.kind}</td>
                <td className="mono">{e.party}</td>
                <td>{e.asset}</td>
                <td className="right mono">{e.amount} {e.asset_type}</td>
                <td><StatusPill s={e.stage} /></td>
                <td className="muted">{e.deadline}</td>
                <td className="right">
                  <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                    <button className="btn sm">Pause</button>
                    <button className="btn sm primary">Force release</button>
                    <button className="btn sm danger">Refund</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
