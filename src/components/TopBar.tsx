"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import VaultMark from "./VaultMark";
import Icon from "./icons";
import { useWallet } from "./WalletProvider";

const topNavItems: [string, string][] = [
  ["/market",    "NFT Loans"],
  ["/miniapps",  "Mini Apps"],
  ["/x",         "X Accounts"],
  ["/farcaster", "Farcaster"],
  ["/escrow",    "Escrow"],
];

export default function TopBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();

  return (
    <header className="topbar">
      <div className="row" style={{ gap: 28 }}>
        <button className="menu-btn" onClick={onMenu} aria-label="Menu">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
        </button>
        <Link href="/" className="brand" style={{ background: "transparent", border: 0, color: "inherit", padding: 0 }}>
          <VaultMark size={26} className="mark-glow"/>
          <span className="name hide-mobile">Baseshire Hathaway<em></em></span>
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
        <button className="btn ghost sm hide-mobile" title="Search"><Icon.search/> <span className="kbd">⌘K</span></button>
        <button className="btn ghost sm hide-mobile" title="Notifications" style={{ position: "relative" }}>
          <Icon.bell/>
          <span style={{ position: "absolute", top: 4, right: 6, width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }}/>
        </button>
        {isConnected ? (
          <div className="wallet" style={{ cursor: "pointer" }} onClick={disconnect}>
            <span className="dot"/>
            <span>{address?.slice(0, 6)}…{address?.slice(-4)}</span>
          </div>
        ) : (
          <button className="btn primary" onClick={connect} disabled={isConnecting}>
            {isConnecting ? "Connecting…" : "Connect wallet"}
          </button>
        )}
      </div>
    </header>
  );
}
