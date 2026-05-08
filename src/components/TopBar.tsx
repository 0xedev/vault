"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import VaultMark from "./VaultMark";
import Icon from "./icons";

const topNavItems: [string, string][] = [
  ["/market",    "NFT Loans"],
  ["/miniapps",  "Mini Apps"],
  ["/x",         "X Accounts"],
  ["/farcaster", "Farcaster"],
  ["/escrow",    "Escrow"],
];

export default function TopBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="row" style={{ gap: 28 }}>
        <button className="menu-btn" onClick={onMenu} aria-label="Menu">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
        </button>
        <Link href="/" className="brand" style={{ background: "transparent", border: 0, color: "inherit", padding: 0 }}>
          <VaultMark size={26} className="mark-glow"/>
          <span className="name">Vault<em>.</em></span>
        </Link>
        <nav className="topnav">
          {topNavItems.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={"tab" + (pathname === href || pathname.startsWith(href + "/") ? " active" : "")}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn ghost sm" title="Search"><Icon.search/> <span className="kbd">⌘K</span></button>
        <button className="btn ghost sm" title="Notifications" style={{ position: "relative" }}>
          <Icon.bell/>
          <span style={{ position: "absolute", top: 4, right: 6, width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }}/>
        </button>
        <div className="wallet">
          <span className="dot"/>
          <span>0x9a4f…c12e</span>
          <span className="muted-2">·</span>
          <span style={{ color: "var(--accent)" }}>14.812 Ξ</span>
        </div>
      </div>
    </header>
  );
}
