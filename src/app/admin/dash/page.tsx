"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import { useWallet } from "@/components/WalletProvider";
import { readPaused, readPausedDeals, writePause, writeUnpause, writePauseDeals, writeUnpauseDeals, writeAddAdmin, writeRemoveAdmin, writeSetTreasury, writeSetPlatformFee, writeAddAdminDeals, writeRemoveAdminDeals, writeSetTreasuryDeals, writeSetPlatformFeeDeals, sendContractCalls, VaultNFT_ABI, VaultDeals_ABI, getNftAddress, getDealsAddress, parseContractError, getPublicClient, type ContractCall } from "@/lib/contract";
import { fmtUSDC } from "@/lib/utils";
import { type Address } from "viem";

type Summary = {
  activeEscrows: number;
  totalLocked: number;
  estimatedFees: number;
  activeDisputes: number;
  openTickets: number;
};

type AuditRow = { id: string; t: string; who: string; action: string; target: string; note: string };
type DisputeRow = { id: string; market: string; filed: string; frozen: number; currency: string; status: string; reason: string };

const emptySummary: Summary = {
  activeEscrows: 0,
  totalLocked: 0,
  estimatedFees: 0,
  activeDisputes: 0,
  openTickets: 0,
};

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [error, setError] = useState("");
  const [paused, setPaused] = useState<boolean | null>(null);
  const [pausedDeals, setPausedDeals] = useState<boolean | null>(null);
  const [pauseLoading, setPauseLoading] = useState<"nft" | "deals" | "">("");
  const [contractLoading, setContractLoading] = useState("");
  const [adminAddr, setAdminAddr] = useState("");
  const [treasuryAddr, setTreasuryAddr] = useState("");
  const [feeBps, setFeeBps] = useState("");
  const { address } = useWallet();

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/summary").then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load summary");
        return json.data;
      }),
      fetch("/api/disputes").then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load disputes");
        return json.data || [];
      }),
      fetch("/api/admin/audit").then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load audit");
        return json.data || [];
      }),
    ])
      .then(([summaryData, disputeData, auditData]) => {
        setSummary(summaryData);
        setDisputes(disputeData);
        setAudit(auditData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load admin dashboard"));

    readPaused().then(setPaused).catch(() => setPaused(null));
    readPausedDeals().then(setPausedDeals).catch(() => setPausedDeals(null));
  }, []);

  const togglePause = async (kind: "nft" | "deals") => {
    if (!address) return;
    setPauseLoading(kind);
    try {
      const isNft = kind === "nft";
      const isPaused = isNft ? paused : pausedDeals;
      const writeFn = isNft
        ? (isPaused ? writeUnpause : writePause)
        : (isPaused ? writeUnpauseDeals : writePauseDeals);
      const hash = await writeFn(address as Address);
      await getPublicClient().waitForTransactionReceipt({ hash });
      if (isNft) setPaused(!paused); else setPausedDeals(!pausedDeals);
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setPauseLoading("");
    }
  };

  const adminAction = async (fn: () => Promise<`0x${string}`>, label: string) => {
    if (!address) return;
    setContractLoading(label);
    try {
      const hash = await fn();
      await getPublicClient().waitForTransactionReceipt({ hash });
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setContractLoading("");
    }
  };

  const batchAdminAction = async (buildCalls: () => Promise<ContractCall[]>, label: string) => {
    if (!address) return;
    setContractLoading(label);
    try {
      const calls = await buildCalls();
      const result = await sendContractCalls(address as Address, calls, { forceAtomic: true });
      if (result.status === "failure") {
        setError("Batch call failed. Check wallet for details.");
        return;
      }
      await Promise.allSettled(
        result.receipts.map((r) => getPublicClient().waitForTransactionReceipt({ hash: r.hash })),
      );
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setContractLoading("");
    }
  };

  return (
    <main id="main-content" role="main" aria-label="Main content" className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--risk)" }}>Operations · live database</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Baseshire Hethaway platform · admin overview.</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={() => window.print()}>Export report</button>
          <button className={"btn" + (paused ? " primary" : " danger")} onClick={() => togglePause("nft")} disabled={pauseLoading === "nft" || paused === null}>
            {pauseLoading === "nft" ? "…" : paused ? "Unpause NFT" : "Pause NFT"}
          </button>
          <button className={"btn" + (pausedDeals ? " primary" : " danger")} onClick={() => togglePause("deals")} disabled={pauseLoading === "deals" || pausedDeals === null}>
            {pauseLoading === "deals" ? "…" : pausedDeals ? "Unpause Deals" : "Pause Deals"}
          </button>
        </div>
      </div>

      {error && <div className="warn-banner" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="metric"><span className="lab">Locked GMV</span><span className="val">{fmtUSDC(summary.totalLocked)} USDC</span><span className="delta">active escrows only</span></div>
        <div className="metric"><span className="lab">Estimated fees</span><span className="val">{fmtUSDC(summary.estimatedFees)} USDC</span><span className="delta">from current locked value</span></div>
        <Link href="/admin/disputes" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="metric" style={{ cursor: "pointer" }}><span className="lab">Active disputes</span><span className="val" style={{ color: "var(--warn)" }}>{summary.activeDisputes}</span><span className="delta" style={{ color: "var(--warn)" }}>requires review</span></div>
        </Link>
        <div className="metric"><span className="lab">Active escrows</span><span className="val">{summary.activeEscrows}</span><span className="delta">not released/refunded</span></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", gap: 22, marginBottom: 22 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Operational queues</div>
          <div className="col" style={{ gap: 14 }}>
            <HealthBar label="Open support tickets" count={summary.openTickets} href="/admin/tickets" />
            <HealthBar label="Active disputes" count={summary.activeDisputes} href="/admin/disputes" />
          </div>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Settlement Health</div>
          <div className="metric"><span className="lab">Escrow utilization</span><span className="val">{fmtUSDC(summary.totalLocked)} USDC</span><span className="delta">live locked funds</span></div>
          <div className="row" style={{ marginTop: 16, gap: 8 }}>
            <span className="smallcaps">NFT</span>
            <span className={"pill" + (paused ? " danger" : " success")} style={{ fontSize: 12 }}>
              <span className="pdot" style={{ background: paused ? "var(--risk)" : "var(--accent)" }} />
              {paused === null ? "Unknown" : paused ? "Paused" : "Active"}
            </span>
          </div>
          <div className="row" style={{ marginTop: 8, gap: 8 }}>
            <span className="smallcaps">Deals</span>
            <span className={"pill" + (pausedDeals ? " danger" : " success")} style={{ fontSize: 12 }}>
              <span className="pdot" style={{ background: pausedDeals ? "var(--risk)" : "var(--accent)" }} />
              {pausedDeals === null ? "Unknown" : pausedDeals ? "Paused" : "Active"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr", gap: 22 }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="row between" style={{ padding: 16, borderBottom: "1px solid var(--line)" }}>
            <span className="eyebrow">Hot disputes</span>
            <Link href="/admin/disputes" className="btn ghost sm">View all →</Link>
          </div>
          <table className="tbl">
            <thead><tr><th>Case</th><th>Market</th><th>Filed</th><th className="right">Frozen</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {disputes.filter(d => d.status !== "resolved").slice(0, 5).length === 0 ? (
                <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 24 }}>No active disputes.</td></tr>
              ) : disputes.filter(d => d.status !== "resolved").slice(0, 5).map(d => (
                <tr key={d.id} style={{ cursor: "pointer" }}>
                  <td><div className="mono" style={{ color: "var(--ink)" }}>{d.id}</div><div className="muted-2" style={{ fontSize: 11 }}>{d.reason}</div></td>
                  <td>{d.market}</td>
                  <td className="muted">{new Date(d.filed).toLocaleDateString()}</td>
                  <td className="right mono">{d.frozen.toLocaleString()} {d.currency}</td>
                  <td><DisputeStatus s={d.status}/></td>
                  <td className="right"><Icon.arrow style={{ color: "var(--ink-3)" }}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Recent admin activity</div>
          <div className="col" style={{ gap: 0 }}>
            {audit.length === 0 && <div className="muted" style={{ padding: 18, textAlign: "center" }}>No audit events recorded yet.</div>}
            {audit.slice(0, 6).map((a, i) => (
              <div key={a.id} className="row" style={{ gap: 10, padding: "8px 0", borderTop: i ? "1px dashed var(--line)" : 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.who === "system" ? "var(--ink-4)" : "var(--risk)", marginTop: 8, flexShrink: 0 }}/>
                <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                  <div className="row between" style={{ gap: 8 }}>
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{a.action}</span>
                    <span className="muted-2" style={{ fontSize: 10.5 }}>{new Date(a.t).toLocaleDateString()}</span>
                  </div>
                  <span className="muted-2" style={{ fontSize: 11.5 }}><span className="mono">{a.who}</span> · <span className="mono">{a.target}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: 22, marginTop: 22 }}>
        <div className="eyebrow" style={{ marginBottom: 14, color: "var(--risk)" }}>Contract Administration</div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          {/* VaultNFT */}
          <div className="col" style={{ gap: 14 }}>
            <span className="smallcaps" style={{ color: "var(--accent)" }}>VaultNFT</span>
            <div className="col" style={{ gap: 8 }}>
              <span className="muted-2" style={{ fontSize: 10.5 }}>Admins</span>
              <div className="row" style={{ gap: 6 }}>
                <input className="input mono" placeholder="0x..." value={adminAddr} onChange={(e) => setAdminAddr(e.target.value)} style={{ flex: 1, fontSize: 11 }} />
                <button className="btn sm primary" disabled={contractLoading !== "" || !adminAddr.startsWith("0x")} onClick={() => adminAction(() => writeAddAdmin(address as Address, adminAddr as Address), "addAdmin")}>{contractLoading === "addAdmin" ? "…" : "Add"}</button>
                <button className="btn sm danger" disabled={contractLoading !== "" || !adminAddr.startsWith("0x")} onClick={() => adminAction(() => writeRemoveAdmin(address as Address, adminAddr as Address), "removeAdmin")}>{contractLoading === "removeAdmin" ? "…" : "Remove"}</button>
              </div>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <span className="muted-2" style={{ fontSize: 10.5 }}>Treasury</span>
              <div className="row" style={{ gap: 6 }}>
                <input className="input mono" placeholder="0x..." value={treasuryAddr} onChange={(e) => setTreasuryAddr(e.target.value)} style={{ flex: 1, fontSize: 11 }} />
                <button className="btn sm" disabled={contractLoading !== "" || !treasuryAddr.startsWith("0x")} onClick={() => adminAction(() => writeSetTreasury(address as Address, treasuryAddr as Address), "setTreasury")}>{contractLoading === "setTreasury" ? "…" : "Set"}</button>
              </div>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <span className="muted-2" style={{ fontSize: 10.5 }}>Platform Fee (bps)</span>
              <div className="row" style={{ gap: 6 }}>
                <input className="input mono" placeholder="e.g. 250" value={feeBps} onChange={(e) => setFeeBps(e.target.value.replace(/\D/g, ""))} style={{ flex: 1, fontSize: 11 }} />
                <button className="btn sm" disabled={contractLoading !== "" || !feeBps || Number(feeBps) > 500} onClick={() => adminAction(() => writeSetPlatformFee(address as Address, BigInt(feeBps)), "setPlatformFee")}>{contractLoading === "setPlatformFee" ? "…" : "Update"}</button>
              </div>
            </div>
          </div>

          {/* VaultDeals */}
          <div className="col" style={{ gap: 14 }}>
            <span className="smallcaps" style={{ color: "var(--info)" }}>VaultDeals</span>
            <div className="col" style={{ gap: 8 }}>
              <span className="muted-2" style={{ fontSize: 10.5 }}>Admins</span>
              <div className="row" style={{ gap: 6 }}>
                <input className="input mono" placeholder="0x..." value={adminAddr} onChange={(e) => setAdminAddr(e.target.value)} style={{ flex: 1, fontSize: 11 }} />
                <button className="btn sm primary" disabled={contractLoading !== "" || !adminAddr.startsWith("0x")} onClick={() => adminAction(() => writeAddAdminDeals(address as Address, adminAddr as Address), "addAdminDeals")}>{contractLoading === "addAdminDeals" ? "…" : "Add"}</button>
                <button className="btn sm danger" disabled={contractLoading !== "" || !adminAddr.startsWith("0x")} onClick={() => adminAction(() => writeRemoveAdminDeals(address as Address, adminAddr as Address), "removeAdminDeals")}>{contractLoading === "removeAdminDeals" ? "…" : "Remove"}</button>
              </div>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <span className="muted-2" style={{ fontSize: 10.5 }}>Treasury</span>
              <div className="row" style={{ gap: 6 }}>
                <input className="input mono" placeholder="0x..." value={treasuryAddr} onChange={(e) => setTreasuryAddr(e.target.value)} style={{ flex: 1, fontSize: 11 }} />
                <button className="btn sm" disabled={contractLoading !== "" || !treasuryAddr.startsWith("0x")} onClick={() => adminAction(() => writeSetTreasuryDeals(address as Address, treasuryAddr as Address), "setTreasuryDeals")}>{contractLoading === "setTreasuryDeals" ? "…" : "Set"}</button>
              </div>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <span className="muted-2" style={{ fontSize: 10.5 }}>Platform Fee (bps)</span>
              <div className="row" style={{ gap: 6 }}>
                <input className="input mono" placeholder="e.g. 250" value={feeBps} onChange={(e) => setFeeBps(e.target.value.replace(/\D/g, ""))} style={{ flex: 1, fontSize: 11 }} />
                <button className="btn sm" disabled={contractLoading !== "" || !feeBps || Number(feeBps) > 500} onClick={() => adminAction(() => writeSetPlatformFeeDeals(address as Address, BigInt(feeBps)), "setPlatformFeeDeals")}>{contractLoading === "setPlatformFeeDeals" ? "…" : "Update"}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Both contracts — batched via sendContractCalls */}
        <div style={{ borderTop: "1px dashed var(--line)", marginTop: 18, paddingTop: 14 }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <span className="smallcaps" style={{ color: "var(--warn)" }}>Both (batch via sendCalls)</span>
            <span className="muted-2" style={{ fontSize: 10 }}>atomic — both succeed or both revert</span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="col" style={{ gap: 6 }}>
              <span className="muted-2" style={{ fontSize: 10 }}>Admins</span>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm primary" style={{ flex: 1 }} disabled={contractLoading !== "" || !adminAddr.startsWith("0x")}
                  onClick={() => batchAdminAction(async () => {
                    const [nft, deals] = await Promise.all([getNftAddress(), getDealsAddress()]);
                    return [
                      { address: nft, abi: VaultNFT_ABI, functionName: "addAdmin", args: [adminAddr as Address] },
                      { address: deals, abi: VaultDeals_ABI, functionName: "addAdmin", args: [adminAddr as Address] },
                    ];
                  }, "batchAddAdmin")}>
                  {contractLoading === "batchAddAdmin" ? "…" : "Add both"}
                </button>
                <button className="btn sm danger" style={{ flex: 1 }} disabled={contractLoading !== "" || !adminAddr.startsWith("0x")}
                  onClick={() => batchAdminAction(async () => {
                    const [nft, deals] = await Promise.all([getNftAddress(), getDealsAddress()]);
                    return [
                      { address: nft, abi: VaultNFT_ABI, functionName: "removeAdmin", args: [adminAddr as Address] },
                      { address: deals, abi: VaultDeals_ABI, functionName: "removeAdmin", args: [adminAddr as Address] },
                    ];
                  }, "batchRemoveAdmin")}>
                  {contractLoading === "batchRemoveAdmin" ? "…" : "Remove both"}
                </button>
              </div>
            </div>
            <div className="col" style={{ gap: 6 }}>
              <span className="muted-2" style={{ fontSize: 10 }}>Treasury</span>
              <button className="btn sm" disabled={contractLoading !== "" || !treasuryAddr.startsWith("0x")}
                onClick={() => batchAdminAction(async () => {
                  const [nft, deals] = await Promise.all([getNftAddress(), getDealsAddress()]);
                  return [
                    { address: nft, abi: VaultNFT_ABI, functionName: "setTreasury", args: [treasuryAddr as Address] },
                    { address: deals, abi: VaultDeals_ABI, functionName: "setTreasury", args: [treasuryAddr as Address] },
                  ];
                }, "batchSetTreasury")}>
                {contractLoading === "batchSetTreasury" ? "…" : "Set both treasuries"}
              </button>
            </div>
            <div className="col" style={{ gap: 6 }}>
              <span className="muted-2" style={{ fontSize: 10 }}>Platform Fee (bps)</span>
              <button className="btn sm" disabled={contractLoading !== "" || !feeBps || Number(feeBps) > 500}
                onClick={() => batchAdminAction(async () => {
                  const [nft, deals] = await Promise.all([getNftAddress(), getDealsAddress()]);
                  return [
                    { address: nft, abi: VaultNFT_ABI, functionName: "setPlatformFee", args: [BigInt(feeBps)] },
                    { address: deals, abi: VaultDeals_ABI, functionName: "setPlatformFee", args: [BigInt(feeBps)] },
                  ];
                }, "batchSetPlatformFee")}>
                {contractLoading === "batchSetPlatformFee" ? "…" : "Set both fees"}
              </button>
            </div>
          </div>
        </div>

        <span className="muted-2" style={{ fontSize: 10.5, marginTop: 12 }}>Max 500 bps (5%). Each contract has independent state — use &quot;Both&quot; to keep them in sync. Pause is not batched (use header buttons).</span>
      </div>
    </main>
  );
}

function HealthBar({ label, count, href }: { label: string; count: number; href: string }) {
  const pct = Math.min(100, count * 10);
  return (
    <Link href={href} className="col" style={{ gap: 4, color: "inherit", textDecoration: "none" }}>
      <div className="row between"><span style={{ fontSize: 12.5 }}>{label}</span><span className="mono" style={{ fontSize: 12, color: count ? "var(--warn)" : "var(--accent)" }}>{count}</span></div>
      <div className="bar"><i style={{ width: pct + "%", background: count ? "var(--warn)" : "var(--accent)" }}/></div>
    </Link>
  );
}

function DisputeStatus({ s }: { s: string }) {
  const m: Record<string, { c: string; t: string }> = {
    new: { c: "var(--risk)", t: "New" },
    evidence: { c: "var(--warn)", t: "Evidence" },
    review: { c: "var(--info)", t: "Review" },
    resolved: { c: "var(--accent)", t: "Resolved" },
  };
  const st = m[s] || { c: "var(--ink-3)", t: s };
  return <span className="pill" style={{ background: `color-mix(in oklab, ${st.c} 14%, transparent)`, color: st.c, borderColor: `color-mix(in oklab, ${st.c} 30%, transparent)` }}><span className="pdot" style={{ background: st.c }}/>{st.t}</span>;
}
