"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import VaultMark from "./VaultMark";
import Icon from "./icons";
import { useWallet } from "./WalletProvider";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type TopNavItem = {
  href: string;
  label: string;
  match: string;
  tab?: string;
};

const topNavItems: TopNavItem[] = [
  { href: "/market", label: "NFT Loans", match: "/market" },
  { href: "/miniapps", label: "Mini Apps", match: "/miniapps" },
  { href: "/x", label: "X Accounts", match: "/x" },
  { href: "/farcaster", label: "Farcaster", match: "/farcaster" },
  { href: "/clanker", label: "Clanker", match: "/clanker" },
  { href: "/market?tab=bundles", label: "Bundles", match: "/market", tab: "bundles" },
  { href: "/deals", label: "Profile", match: "/deals" },
];

const adminNavItem: TopNavItem = { href: "/admin/dash", label: "Admin", match: "/admin" };

function formatIdentity(address: string | null) {
  if (!address) return "";
  if (address.startsWith("farcaster:")) {
    return `FID ${address.replace("farcaster:", "")}`;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function TopBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");
  const {
    address,
    isAuthenticated,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    role,
  } = useWallet();
  const navItems = role === "admin" ? [...topNavItems, adminNavItem] : topNavItems;

  return (
    <header className="topbar">
      <div className="row" style={{ gap: 28 }}>
        <Button variant="ghost" size="icon" className="menu-btn" onClick={onMenu} aria-label="Menu">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
        </Button>
        <Link href="/" className="brand" style={{ background: "transparent", border: 0, color: "inherit", padding: 0 }}>
          <VaultMark size={26} className="mark-glow" priority/>
          <span className="name hide-mobile">Baseshire Hethaway<em></em></span>
        </Link>
        <nav className="topnav">
          {navItems.map((item) => {
            const isActive =
              item.tab
                ? pathname === item.match && activeTab === item.tab
                : pathname === item.match || pathname.startsWith(item.match + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"tab" + (isActive ? " active" : "")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="hide-mobile" title="Search"><Icon.search/> <span className="kbd">⌘K</span></Button>
            </TooltipTrigger>
            <TooltipContent>Search</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="hide-mobile" title="Notifications" style={{ position: "relative" }}>
                <Icon.bell/>
                <span style={{ position: "absolute", top: 4, right: 6, width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }}/>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {isConnected && isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="wallet">
                <span className="dot"/>
                <span>{formatIdentity(address)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={disconnect}>Disconnect</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={connect} disabled={isConnecting}>
            {isConnecting ? "Connecting…" : isConnected ? "Sign in" : "Connect wallet"}
          </Button>
        )}
      </div>
    </header>
  );
}
