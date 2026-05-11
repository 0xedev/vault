"use client";

import React, { useState, useEffect, Suspense } from "react";
import AdminTopBar from "@/components/AdminTopBar";
import AdminSideBar from "@/components/AdminSideBar";
import TweaksPanel from "@/components/TweaksPanel";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WalletProvider } from "@/components/WalletProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    document.body.dataset.role = "admin";
    return () => { delete document.body.dataset.role; };
  }, []);

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
        <div className="app admin-app">
          <Suspense fallback={null}>
            <AdminTopBar onMenu={handleMenu} />
            <AdminSideBar open={drawer} onClose={() => setDrawer(false)} />
          </Suspense>
          <div className={"scrim" + (drawer ? " open" : "")} onClick={() => setDrawer(false)}/>
          {children}
          <TweaksPanel />
        </div>
      </WalletProvider>
    </ThemeProvider>
  );
}
