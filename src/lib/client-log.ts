export function logClientError(label: string, error: unknown, extra?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error ?? "undefined");
  const stack = error instanceof Error ? error.stack : undefined;
  const payload = { label, error: message, stack, extra };
  try {
    fetch("/api/log-error", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // never throw from a side-effect log call
  }
}
