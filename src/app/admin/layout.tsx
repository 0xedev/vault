"use client";

import React, { useState, useEffect, Suspense } from "react";
import AdminTopBar from "@/components/AdminTopBar";
import AdminSideBar from "@/components/AdminSideBar";
import TweaksPanel from "@/components/TweaksPanel";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useWallet, WalletProvider } from "@/components/WalletProvider";

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
          <AdminGate>{children}</AdminGate>
          <TweaksPanel />
        </div>
      </WalletProvider>
    </ThemeProvider>
  );
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const { isConnected, isConnecting, connect, role } = useWallet();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Use role from wallet context — session is already managed by WalletProvider
    queueMicrotask(() => {
      setAllowed(role === "admin");
      setChecked(true);
    });
  }, [role]);

  if (!checked) {
    return <main id="main-content" role="main" aria-label="Main content" className="main"><div className="muted" style={{ padding: 80, textAlign: "center" }}>Checking admin session...</div></main>;
  }

  if (!allowed) {
    return (
      <main id="main-content" role="main" aria-label="Main content" className="main">
        <div className="card" style={{ maxWidth: 520, margin: "72px auto", padding: 32, textAlign: "center" }}>
          <div className="eyebrow" style={{ color: "var(--risk)", marginBottom: 10 }}>Admin access required</div>
          <h1 className="serif" style={{ fontSize: 28, margin: "0 0 10px" }}>Sign in with an admin wallet.</h1>
          <p className="muted" style={{ fontSize: 13, margin: "0 auto 18px", maxWidth: 360 }}>
            This area is restricted to authorized admin wallets.
          </p>
          <button className="btn primary" onClick={connect} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : isConnected ? "Sign in again" : "Connect wallet"}
          </button>
        </div>
      </main>
    );
  }

  return children;
}
