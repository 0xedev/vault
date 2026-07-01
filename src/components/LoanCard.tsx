/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Icon from "./icons";
import NFTArt from "./NFTArt";
import StatusPill from "./StatusPill";
import { Badge } from "@/components/ui/badge";
import { COLLECTIONS } from "@/lib/data";
import { fmtETH, fmtUSDC } from "@/lib/utils";
import type { Loan } from "@/lib/data";

function NftImage({ l }: { l: Loan }) {
  if (l.imageUrl) {
    return (
      <img
        src={l.imageUrl}
        alt={`${COLLECTIONS[l.coll]} ${l.token}`}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return <NFTArt seed={l.coll} label={l.token} />;
}

export default function LoanCard({ l, onShare }: { l: Loan; onShare?: (loan: Loan) => void }) {
  return (
    <article className="loan-card">
      <Link href={`/detail?id=${l.id}`} className="ghost-hit-area" aria-label={`View ${COLLECTIONS[l.coll]} ${l.token}`} />
      {onShare && (
        <button
          type="button"
          className="card-icon-btn loan-share-btn"
          onClick={() => onShare(l)}
          aria-label={`Share ${COLLECTIONS[l.coll]} ${l.token}`}
          title="Share"
        >
          <Icon.share />
        </button>
      )}
      <div className="loan-card-media" style={{ position: "relative" }}>
        <NftImage l={l} />
        <Badge variant="outline" className="pill floor-pill" style={{ position: "absolute", top: 8, right: 8, gap: 4 }}>
          <span className="pdot" style={{ background: "var(--gold)" }} />
          <span className="nowrap">{fmtETH(l.value)} Ξ floor</span>
          <span className="mono" style={{ fontSize: 9, opacity: 0.6, marginLeft: 2 }}>±3%</span>
        </Badge>
      </div>
      <div className="row between">
        <span className="nm trunc">{COLLECTIONS[l.coll]}</span>
        <StatusPill s={l.status} />
      </div>
      <div className="row between">
        <div className="col" style={{ gap: 1 }}>
          <span className="meta">Borrow</span>
          <span className="amt">{fmtUSDC(l.amt)} <span style={{ fontSize: 12, color: "var(--ink-3)" }}>USDC</span></span>
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
    </article>
  );
}
