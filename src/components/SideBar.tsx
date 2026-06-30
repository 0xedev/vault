"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Icon from "./icons";

interface SidebarItem {
  sec?: string;
  k?: string;
  href?: string;
  tab?: string;
  t?: string;
  icon?: React.ReactNode;
}

const items: SidebarItem[] = [
  { sec: "Marketplaces" },
  { k: "/market",    t: "NFT Loans",         icon: <Icon.market/> },
  { k: "/miniapps",  t: "Mini Apps",         icon: <Icon.app/> },
  { k: "/x",         t: "X Accounts",        icon: <Icon.xlogo/> },
  { k: "/farcaster", t: "Farcaster",         icon: <Icon.cast/> },
  { k: "/clanker",   t: "Clanker Tokens",    icon: <Icon.token/> },
  { k: "/market", href: "/market?tab=bundles", tab: "bundles", t: "Bundles",  icon: <Icon.shield/> },
  { sec: "Account" },
  { k: "/deals",     t: "Profile",           icon: <Icon.escrow/> },
  { sec: "About" },
  { k: "/info",      t: "How it works",       icon: <Icon.shield/> },
];

export default function SideBar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");

  return (
    <aside className={"sidebar" + (open ? " open" : "")}>
      <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
        <Icon.x />
      </button>

      {items.map((it, i) => {
        if (it.sec) return <div className="side-h" key={"s"+i}>{it.sec}</div>;
        const isActive = it.tab
          ? pathname === it.k && activeTab === it.tab
          : (pathname === it.k || pathname.startsWith(it.k! + "/")) && activeTab !== "bundles";
        return (
          <Link
            key={it.href || it.k}
            href={it.href || it.k!}
            className={"side-link" + (isActive ? " active" : "")}
            onClick={onClose}
          >
            <span className="icn">{it.icon}</span>
            <span>{it.t}</span>
          </Link>
        );
      })}
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
