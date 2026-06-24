import Link from "next/link";

export default function NotFound() {
  return (
    <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
      <div className="card" style={{ maxWidth: 480, padding: 32, textAlign: "center" }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>404</div>
        <h2 className="serif" style={{ fontSize: 28, margin: "0 0 10px" }}>Page not found</h2>
        <p className="muted" style={{ fontSize: 13, margin: "0 auto 18px", maxWidth: 360 }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/" className="btn primary" style={{ textDecoration: "none" }}>Go home</Link>
      </div>
    </main>
  );
}
