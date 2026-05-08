"use client";

import { ESCROWS } from "@/lib/data";
import Icon from "@/components/icons";

export default function HistoryPage() {
  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div className="eyebrow">History</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Transaction history.</h1>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr>
            <th>Tx</th><th>Type</th><th>Asset</th><th className="right">Value</th><th>From</th><th>Date</th>
          </tr></thead>
          <tbody>
            {ESCROWS.map((e, i) => (
              <tr key={e.id}>
                <td className="mono">0xa3…0{i}f</td>
                <td>{e.kind}</td>
                <td>{e.asset}</td>
                <td className="right mono">{e.amount} {e.asset_type}</td>
                <td className="mono">{e.party}</td>
                <td className="muted">{e.deadline}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
