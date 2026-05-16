"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import StatusPill from "@/components/StatusPill";
import { fmtETH } from "@/lib/utils";
import type { Escrow } from "@/lib/data";

const stages = ["all", "Awaiting deposit", "Funds locked", "Transfer", "Awaiting confirmation", "Released", "Disputed", "Refunded"];

export default function EscrowCenterPage() {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");

  useEffect(() => {
    fetch("/api/escrows")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load escrows");
        return json;
      })
      .then((json) => {
        setEscrows(json.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load escrows");
        setLoading(false);
      });
  }, []);

  const filt = escrows.filter((e) => tab === "all" || e.stage === tab);
  const totalLocked = escrows.reduce((sum, escrow) => sum + escrow.amount, 0);
  const atRiskCount = escrows.filter((e) => e.stage === "Disputed" || e.stage === "Awaiting confirmation").length;

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div className="eyebrow">Escrow Center</div>
          <h1 className="h2" style={{ marginTop: 8 }}>{escrows.length} active escrows · <span className="nowrap">{fmtETH(totalLocked)} Ξ</span> locked.</h1>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn" onClick={() => {
            const csv = "id,kind,party,asset,amount,stage,deadline\n" + escrows.map(e => `${e.id},${e.kind},${e.party},${e.asset},${e.amount},${e.stage},${e.deadline}`).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "escrows.csv"; a.click();
          }}>Export CSV</button>
          <Link href="/deals" className="btn primary">New escrow</Link>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="metric"><span className="lab">Funds locked</span><span className="val">{fmtETH(totalLocked)} Ξ</span><span className="delta">across {escrows.length} deals</span></div>
        <div className="metric"><span className="lab">Assets locked</span><span className="val">{escrows.length}</span><span className="delta">from live escrows</span></div>
        <div className="metric"><span className="lab">Needs action</span><span className="val" style={{ color: "var(--warn)" }}>{atRiskCount}</span><span className="delta down">confirmation or dispute</span></div>
        <div className="metric"><span className="lab">Platform fees · est.</span><span className="val">{fmtETH(totalLocked * 0.015)} Ξ</span><span className="delta">1.5% origination</span></div>
      </div>

      <div className="card">
        <div className="row" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", justifyContent: "space-between" }}>
          <div className="chips">
            {stages.map((s) => (
              <button key={s} className={"chip" + (tab === s ? " active" : "")} onClick={() => setTab(s)}>
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" placeholder="Search escrow id, asset…" style={{ width: 260, height: 32 }} />
          </div>
        </div>
        {loading ? (
          <div className="muted" style={{ padding: 40, textAlign: "center" }}>Loading escrows…</div>
        ) : error ? (
          <div className="warn-banner" style={{ margin: 18 }}>{error}</div>
        ) : (
          <table className="tbl">
            <thead><tr>
              <th>ID · Type</th><th>Counterparty</th><th>Asset</th><th className="right">Locked</th>
              <th>Stage</th><th>Deadline</th><th>Required action</th><th></th>
            </tr></thead>
            <tbody>
              {filt.map((e) => (
                <tr key={e.id} style={{ cursor: "pointer" }}>
                  <td>
                    <Link href="/deals" style={{ color: "inherit", textDecoration: "none" }}>
                      <div className="mono" style={{ color: "var(--ink)" }}>{e.id}</div>
                    </Link>
                    <div className="muted-2" style={{ fontSize: 11 }}>{e.kind}</div>
                  </td>
                  <td className="mono">{e.party}</td>
                  <td>{e.asset}</td>
                  <td className="right mono">{fmtETH(e.amount)} {e.asset_type}</td>
                  <td><StatusPill s={e.stage} /></td>
                  <td className="muted">{e.deadline}</td>
                  <td style={{ color: e.stage === "At risk" ? "var(--risk)" : "var(--ink-2)" }}>{e.action}</td>
                  <td className="right"><Icon.arrow style={{ color: "var(--ink-3)" }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
