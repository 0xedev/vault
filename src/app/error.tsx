"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error boundary caught:", error);
  }, [error]);

  return (
    <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
      <div className="card" style={{ maxWidth: 480, padding: 32, textAlign: "center" }}>
        <div className="eyebrow" style={{ color: "var(--risk)", marginBottom: 10 }}>Something went wrong</div>
        <h2 className="serif" style={{ fontSize: 24, margin: "0 0 10px" }}>An unexpected error occurred.</h2>
        <p className="muted" style={{ fontSize: 13, margin: "0 auto 18px", maxWidth: 360 }}>
          The error has been logged. Please try again.
        </p>
        <button className="btn primary" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
