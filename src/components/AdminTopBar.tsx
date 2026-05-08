"use client";

import Link from "next/link";
import VaultMark from "./VaultMark";
import Icon from "./icons";

export default function AdminTopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="topbar admin-topbar">
      <div className="row" style={{ gap: 18 }}>
        <button className="menu-btn" onClick={onMenu} aria-label="Menu">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
        </button>
        <div className="brand" style={{ background: "transparent", border: 0, color: "inherit", padding: 0, display: "flex", gap: 10, alignItems: "center" }}>
          <VaultMark size={26}/>
          <span className="name">Vault<em>.</em></span>
          <span className="admin-badge">ADMIN</span>
        </div>
        <span className="muted-2" style={{ fontSize: 12 }}>Internal · admin</span>
      </div>
      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        <button className="btn ghost sm" title="Search"><Icon.search/> <span className="kbd">⌘K</span></button>
        <button className="btn ghost sm" title="Notifications" style={{ position: "relative" }}>
          <Icon.bell/>
          <span style={{ position: "absolute", top: 4, right: 6, width: 6, height: 6, borderRadius: "50%", background: "var(--risk)" }}/>
        </button>
        <Link href="/" className="btn ghost sm">Switch to user view ↗</Link>
        <div className="wallet admin-wallet">
          <span className="dot" style={{ background: "var(--risk)" }}/>
          <span>alice.admin</span>
          <span className="muted-2">·</span>
          <span style={{ color: "var(--risk)" }}>L4</span>
        </div>
      </div>
    </header>
  );
}
