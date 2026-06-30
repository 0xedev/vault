"use client";

import Link from "next/link";
import VaultMark from "./VaultMark";
import Icon from "./icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function AdminTopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="topbar admin-topbar">
      <div className="row" style={{ gap: 18 }}>
        <Button variant="ghost" size="icon" className="menu-btn" onClick={onMenu} aria-label="Menu">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
        </Button>
        <div className="brand" style={{ background: "transparent", border: 0, color: "inherit", padding: 0, display: "flex", gap: 10, alignItems: "center" }}>
          <VaultMark size={26}/>
          <span className="name hide-mobile">Baseshire Hethaway<em></em></span>
          <Badge variant="destructive" className="admin-badge"><span className="admin-badge-full">ADMIN</span><span className="admin-badge-short">A</span></Badge>
        </div>
        <span className="muted-2 hide-mobile" style={{ fontSize: 12 }}>Internal · admin</span>
      </div>
      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild><Button variant="ghost" size="sm" className="hide-mobile"><Icon.search/> <span className="kbd">⌘K</span></Button></TooltipTrigger>
            <TooltipContent>Search</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="hide-mobile" style={{ position: "relative" }}>
                <Icon.bell/>
                <span style={{ position: "absolute", top: 4, right: 6, width: 6, height: 6, borderRadius: "50%", background: "var(--risk)" }}/>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button asChild variant="ghost" size="sm"><Link href="/">Switch to user view ↗</Link></Button>
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
