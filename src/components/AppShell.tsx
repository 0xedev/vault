"use client";

import React, { useState, Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import TopBar from "./TopBar";
import SideBar from "./SideBar";
import TweaksPanel from "./TweaksPanel";
import { ThemeProvider } from "./ThemeProvider";
import { WalletProvider } from "./WalletProvider";
import { RoleProvider } from "./RoleProvider";

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
          </div>
        </RoleProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
