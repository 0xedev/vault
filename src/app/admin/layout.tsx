"use client";

import React, { useState, useEffect, Suspense } from "react";
import AdminTopBar from "@/components/AdminTopBar";
import AdminSideBar from "@/components/AdminSideBar";
import TweaksPanel from "@/components/TweaksPanel";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    document.body.dataset.role = "admin";
    return () => { delete document.body.dataset.role; };
  }, []);

  return (
    <ThemeProvider>
      <div className="app admin-app">
        <Suspense fallback={null}>
          <AdminTopBar onMenu={() => setDrawer(true)} />
          <AdminSideBar open={drawer} onClose={() => setDrawer(false)} />
        </Suspense>
        <div className={"scrim" + (drawer ? " open" : "")} onClick={() => setDrawer(false)}/>
        {children}
        <TweaksPanel />
      </div>
    </ThemeProvider>
  );
}
