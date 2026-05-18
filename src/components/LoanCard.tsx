import Link from "next/link";
import NFTArt from "./NFTArt";
import StatusPill from "./StatusPill";
import { COLLECTIONS } from "@/lib/data";
import { fmtETH } from "@/lib/utils";
import type { Loan } from "@/lib/data";

export default function LoanCard({ l }: { l: Loan }) {
  return (
    <Link href={`/detail?id=${l.id}`} className="loan-card">
      <div style={{ position: "relative" }}>
        <NFTArt seed={l.coll} label={l.token} />
        <span className="pill floor-pill" style={{ position: "absolute", top: 8, right: 8, gap: 4 }}>
          <span className="pdot" style={{ background: "var(--gold)" }} />
          <span className="nowrap">{fmtETH(l.value)} Ξ floor</span>
          <span className="mono" style={{ fontSize: 9, opacity: 0.6, marginLeft: 2 }}>±3%</span>
        </span>
      </div>
      <div className="row between">
        <span className="nm trunc">{COLLECTIONS[l.coll]}</span>
        <StatusPill s={l.status} />
      </div>
      <div className="row between">
        <div className="col" style={{ gap: 1 }}>
          <span className="meta">Borrow</span>
          <span className="amt">{fmtETH(l.amt)} <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Ξ</span></span>
        </div>
        <div className="col" style={{ gap: 1 }}>
          <span className="meta">APR</span>
          <span className="amt">{l.apr}<span style={{ fontSize: 12, color: "var(--ink-3)" }}>%</span></span>
        </div>
        <div className="col" style={{ gap: 1 }}>
          <span className="meta">Term</span>
          <span className="amt">{l.term}<span style={{ fontSize: 12, color: "var(--ink-3)" }}>d</span></span>
        </div>
      </div>
      <div>
        <div className="row between" style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 4 }}>
          <span>LTV {l.ltv}%</span><span>{l.bid} offers</span>
        </div>
        <div className="bar"><i style={{ width: l.ltv + "%", background: l.ltv > 65 ? "var(--warn)" : "var(--accent)" }} /></div>
      </div>
    </Link>
  );
}
