export default function UserLoading() {
  return (
    <main id="main-content" role="main" className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60dvh" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 12px" }} />
        <p className="muted" style={{ fontSize: 13 }}>Loading...</p>
      </div>
    </main>
  );
}
