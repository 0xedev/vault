"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
          <div className="card" style={{ maxWidth: 480, padding: 32, textAlign: "center" }}>
            <div className="eyebrow" style={{ color: "var(--risk)", marginBottom: 10 }}>Critical Error</div>
            <h2 className="serif" style={{ fontSize: 24, margin: "0 0 10px" }}>The application crashed.</h2>
            <p className="muted" style={{ fontSize: 13, margin: "0 auto 18px", maxWidth: 360 }}>
              This is a fatal error in the root layout. Please reload the page.
            </p>
            <button className="btn primary" onClick={reset}>Reload</button>
          </div>
        </main>
      </body>
    </html>
  );
}
