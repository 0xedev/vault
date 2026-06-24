"use client";

import { useEffect } from "react";

export default function UserError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("User page error:", error);
  }, [error]);

  return (
    <main id="main-content" role="main" className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60dvh" }}>
      <div className="card" style={{ maxWidth: 480, padding: 32, textAlign: "center" }}>
        <div className="eyebrow" style={{ color: "var(--risk)", marginBottom: 10 }}>Error</div>
        <h2 className="serif" style={{ fontSize: 24, margin: "0 0 10px" }}>Something went wrong.</h2>
        <p className="muted" style={{ fontSize: 13, margin: "0 auto 18px", maxWidth: 360 }}>
          An error occurred while loading this page.
        </p>
        <button className="btn primary" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
