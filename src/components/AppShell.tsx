"use client";

import React, { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import TopBar from "./TopBar";
import SideBar from "./SideBar";
import TweaksPanel from "./TweaksPanel";
import { ThemeProvider } from "./ThemeProvider";
import { WalletProvider } from "./WalletProvider";
import { RoleProvider } from "./RoleProvider";
import Icon from "./icons";

const mobileNavItems = [
  { href: "/", label: "Home", icon: <Icon.home /> },
  { href: "/market", label: "Market", icon: <Icon.market /> },
  { href: "/escrow", label: "Escrow", icon: <Icon.escrow /> },
  { href: "/deals", label: "Deals", icon: <Icon.deal /> },
  { href: "/portfolio", label: "You", icon: <Icon.shield /> },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  const isLanding = pathname === "/";

  // Only open drawer on mobile
  const handleMenu = () => {
    if (window.innerWidth <= 820) setDrawer(true);
  };

  // Auto-close drawer on desktop resize
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 820) setDrawer(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <ThemeProvider>
      <WalletProvider>
        <RoleProvider>
          <div className="app" data-page={isLanding ? "landing" : "default"} style={isLanding ? { gridTemplateColumns: "1fr" } : undefined}>
            <Suspense fallback={null}>
              <TopBar onMenu={handleMenu} />
              <SideBar open={drawer} onClose={() => setDrawer(false)} />
            </Suspense>
            <div className={"scrim" + (drawer ? " open" : "")} onClick={() => setDrawer(false)}/>
            {children}
            <TweaksPanel />
            <nav className="mobile-bottom-nav" aria-label="Primary mobile navigation">
              {mobileNavItems.map((item) => {
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
                return (
                  <Link key={item.href} href={item.href} className={active ? "active" : ""}>
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </RoleProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
