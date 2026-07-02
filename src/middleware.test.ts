import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

describe("proxy CSP", () => {
  it("allows AppKit, WalletConnect, and Coinbase domains for wallet flows", async () => {
    const req = new NextRequest("https://vault.example/market");
    const res = await proxy(req);
    const csp = res.headers.get("Content-Security-Policy") || "";

    expect(csp).toContain("https://api.web3modal.org");
    expect(csp).toContain("https://cca-lite.coinbase.com");
    expect(csp).toContain("https://fonts.googleapis.com");
    expect(csp).toContain("https://relay.walletconnect.com");
  });
});
