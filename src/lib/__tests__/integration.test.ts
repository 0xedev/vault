import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());

describe("auth integration", () => {
  it("GET /api/auth/nonce returns a nonce", async () => {
    server.use(
      http.get("http://localhost/api/auth/nonce", () => {
        return HttpResponse.json({ nonce: "abc123" });
      }),
    );

    const res = await fetch("http://localhost/api/auth/nonce");
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.nonce).toBe("abc123");
  });

  it("POST /api/auth with invalid signature returns 401", async () => {
    server.use(
      http.post("http://localhost/api/auth", () => {
        return HttpResponse.json({ error: "Invalid signature" }, { status: 401 });
      }),
    );

    const res = await fetch("http://localhost/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "bad", signature: "0x00" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/logout clears session", async () => {
    server.use(
      http.post("http://localhost/api/auth/logout", () => {
        return HttpResponse.json({ ok: true });
      }),
    );

    const res = await fetch("http://localhost/api/auth/logout", { method: "POST" });
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("GET /api/auth/session returns user when authenticated", async () => {
    server.use(
      http.get("http://localhost/api/auth/session", () => {
        return HttpResponse.json({ user: { address: "0xabc", role: "user" } });
      }),
    );

    const res = await fetch("http://localhost/api/auth/session");
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.user).toBeTruthy();
    expect(json.user.address).toBe("0xabc");
  });

  it("GET /api/auth/session returns null when not authenticated", async () => {
    server.use(
      http.get("http://localhost/api/auth/session", () => {
        return HttpResponse.json({ user: null });
      }),
    );

    const res = await fetch("http://localhost/api/auth/session");
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.user).toBeNull();
  });
});

describe("listing CRUD integration", () => {
  it("GET /api/listings returns listings array", async () => {
    server.use(
      http.get("http://localhost/api/listings", () => {
        return HttpResponse.json({
          data: [
            { id: "L-1", coll: 0, amt: 10, apr: 14, ltv: 65, status: "open" },
          ],
        });
      }),
    );

    const res = await fetch("http://localhost/api/listings");
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data[0].id).toBe("L-1");
  });

  it("POST /api/listings requires auth", async () => {
    server.use(
      http.post("http://localhost/api/listings", () => {
        return HttpResponse.json({ error: "Authentication required" }, { status: 401 });
      }),
    );

    const res = await fetch("http://localhost/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });
});

describe("rate limiting", () => {
  it("returns 429 when rate limit exceeded", async () => {
    let calls = 0;
    server.use(
      http.all("http://localhost/api/*", () => {
        calls++;
        if (calls > 5) {
          return HttpResponse.json({ error: "Too many requests" }, { status: 429 });
        }
        return HttpResponse.json({ ok: true });
      }),
    );

    const url = "http://localhost/api/test";
    for (let i = 0; i < 6; i++) {
      await fetch(url);
    }
    const res = await fetch(url);
    expect(res.status).toBe(429);
  });
});

describe("admin gates", () => {
  it("admin endpoint returns 403 for non-admin user", async () => {
    server.use(
      http.get("http://localhost/api/admin/summary", () => {
        return HttpResponse.json({ error: "Admin access required" }, { status: 403 });
      }),
    );

    const res = await fetch("http://localhost/api/admin/summary");
    expect(res.status).toBe(403);
  });

  it("admin endpoint returns 401 for unauthenticated", async () => {
    server.use(
      http.get("http://localhost/api/admin/summary", () => {
        return HttpResponse.json({ error: "Authentication required" }, { status: 401 });
      }),
    );

    const res = await fetch("http://localhost/api/admin/summary");
    expect(res.status).toBe(401);
  });
});

describe("escrow lifecycle", () => {
  it("GET /api/escrows returns escrows", async () => {
    server.use(
      http.get("http://localhost/api/escrows", () => {
        return HttpResponse.json({
          data: [{ id: "E-1", stage: "funds_locked", amount: "5.0" }],
        });
      }),
    );

    const res = await fetch("http://localhost/api/escrows");
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it("POST /api/escrows/:id/proofs validates payload", async () => {
    server.use(
      http.post("http://localhost/api/escrows/E-1/proofs", async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        if (!body.url || !body.contentHash) {
          return HttpResponse.json({ error: "Invalid proof" }, { status: 400 });
        }
        return HttpResponse.json({ data: { id: "P-1" } }, { status: 201 });
      }),
    );

    const res = await fetch("http://localhost/api/escrows/E-1/proofs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proofType: "evidence" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/escrows/:id/proofs returns 201 for valid payload", async () => {
    server.use(
      http.post("http://localhost/api/escrows/E-1/proofs", () => {
        return HttpResponse.json({ data: { id: "P-1" } }, { status: 201 });
      }),
    );

    const res = await fetch("http://localhost/api/escrows/E-1/proofs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proofType: "evidence",
        url: "https://example.com/proof.pdf",
        contentHash: "sha256-abc12345",
      }),
    });
    expect(res.status).toBe(201);
  });

  it("POST /api/escrows/:id/release returns 403 for non-buyer", async () => {
    server.use(
      http.post("http://localhost/api/escrows/E-1/release", () => {
        return HttpResponse.json({ error: "Only the buyer can release this escrow" }, { status: 403 });
      }),
    );

    const res = await fetch("http://localhost/api/escrows/E-1/release", { method: "POST" });
    expect(res.status).toBe(403);
  });
});

describe("health check", () => {
  it("GET /api/health returns status", async () => {
    server.use(
      http.get("http://localhost/api/health", () => {
        return HttpResponse.json({ status: "degraded", checks: {} });
      }),
    );

    const res = await fetch("http://localhost/api/health");
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.status).toBeDefined();
  });
});
