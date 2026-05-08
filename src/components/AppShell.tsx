"use client";

import React, { useState, Suspense } from "react";
import { usePathname } from "next/navigation";
import TopBar from "./TopBar";
import SideBar from "./SideBar";
import TweaksPanel from "./TweaksPanel";
import { ThemeProvider } from "./ThemeProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <ThemeProvider>
      <div className="app" style={isLanding ? { gridTemplateColumns: "1fr" } : undefined}>
        <Suspense fallback={null}>
          <TopBar onMenu={() => setDrawer(true)} />
          {!isLanding && <SideBar open={drawer} onClose={() => setDrawer(false)} />}
        </Suspense>
        {!isLanding && <div className={"scrim" + (drawer ? " open" : "")} onClick={() => setDrawer(false)}/>}
        {children}
        <TweaksPanel />
      </div>
    </ThemeProvider>
  );
}
