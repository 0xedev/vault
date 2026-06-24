import { describe, it, expect } from "vitest";
import { csrfCheck } from "@/lib/security";
import { NextRequest } from "next/server";

function createRequest(method: string, headers: Record<string, string>): NextRequest {
  const url = new URL("https://example.com/api/test");
  const req = new NextRequest(url, {
    method,
    headers: new Headers(headers),
  });
  return req;
}

describe("security", () => {
  describe("csrfCheck", () => {
    it("allows GET requests without origin", () => {
      const req = createRequest("GET", {});
      const res = csrfCheck(req);
      expect(res.status).toBe(200);
    });

    it("blocks POST requests without origin", () => {
      const req = createRequest("POST", {});
      const res = csrfCheck(req);
      expect(res.status).toBe(403);
    });

    it("allows POST with matching origin", () => {
      const req = createRequest("POST", {
        origin: "https://example.com",
        host: "example.com",
        "x-forwarded-proto": "https",
      });
      const res = csrfCheck(req);
      expect(res.status).toBe(200);
    });

    it("blocks POST with mismatched origin", () => {
      const req = createRequest("POST", {
        origin: "https://evil.com",
        host: "example.com",
        "x-forwarded-proto": "https",
      });
      const res = csrfCheck(req);
      expect(res.status).toBe(403);
    });
  });
});
