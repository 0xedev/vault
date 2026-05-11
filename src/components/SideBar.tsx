"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./icons";

interface SidebarItem {
  sec?: string;
  k?: string;
  t?: string;
  icon?: React.ReactNode;
  badge?: string;
}

const items: SidebarItem[] = [
  { sec: "Marketplaces" },
  { k: "/market",    t: "NFT Loans",         icon: <Icon.market/>, badge: "284" },
  { k: "/miniapps",  t: "Mini Apps",         icon: <Icon.app/>,    badge: "62" },
  { k: "/x",         t: "X Accounts",        icon: <Icon.xlogo/>,  badge: "118" },
  { k: "/farcaster", t: "Farcaster",         icon: <Icon.cast/>,   badge: "44" },
  { sec: "Settlement" },
  { k: "/escrow",    t: "Escrow Center",     icon: <Icon.escrow/>, badge: "6" },
  { k: "/deals",     t: "Deal Room",         icon: <Icon.deal/> },
  { sec: "You" },
  { k: "/portfolio", t: "Portfolio",         icon: <Icon.shield/> },
  { k: "/history",   t: "History",           icon: <Icon.clock/> },
];

export default function SideBar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <aside className={"sidebar" + (open ? " open" : "")}>
      <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
        <Icon.x />
      </button>
      {items.map((it, i) =>
        it.sec ? (
          <div className="side-h" key={"s"+i}>{it.sec}</div>
        ) : (
          <Link
            key={it.k}
            href={it.k!}
            className={"side-link" + (pathname === it.k || pathname.startsWith(it.k! + "/") ? " active" : "")}
            onClick={onClose}
          >
            <span className="icn">{it.icon}</span>
            <span>{it.t}</span>
            {it.badge && <span className="badge">{it.badge}</span>}
          </Link>
        )
      )}
      <div style={{ flex: 1 }}/>
      <div className="card" style={{ padding: 12, marginTop: 20 }}>
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <Icon.shield/>
          <span className="smallcaps" style={{ color: "var(--ink-2)" }}>Protected</span>
        </div>
        <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.4 }}>
          Funds + collateral held in audited escrow. <a className="lnk" href="#">Read terms ↗</a>
        </div>
      </div>
    </aside>
  );
}
