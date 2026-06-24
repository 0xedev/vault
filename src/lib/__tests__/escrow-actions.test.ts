import { describe, it, expect } from "vitest";
import { proofSchema } from "@/lib/escrow-actions";

describe("escrow-actions", () => {
  describe("proofSchema", () => {
    it("validates a valid proof payload", () => {
      const result = proofSchema.safeParse({
        proofType: "evidence",
        url: "https://example.com/proof.pdf",
        contentHash: "sha256-abc12345",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing required fields", () => {
      const result = proofSchema.safeParse({
        proofType: "evidence",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid URL", () => {
      const result = proofSchema.safeParse({
        proofType: "evidence",
        url: "not-a-url",
        contentHash: "sha256-abc12345",
      });
      expect(result.success).toBe(false);
    });

    it("rejects short content hash", () => {
      const result = proofSchema.safeParse({
        proofType: "evidence",
        url: "https://example.com/proof.pdf",
        contentHash: "abc",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all proof types", () => {
      for (const t of ["transfer", "delivery", "evidence", "other"]) {
        const result = proofSchema.safeParse({
          proofType: t,
          url: "https://example.com/proof.pdf",
          contentHash: "sha256-def67890",
        });
        expect(result.success).toBe(true);
      }
    });

    it("applies default proofType", () => {
      const result = proofSchema.safeParse({
        url: "https://example.com/proof.pdf",
        contentHash: "sha256-abc12345",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.proofType).toBe("evidence");
      }
    });

    it("rejects note longer than 1000 chars", () => {
      const result = proofSchema.safeParse({
        proofType: "evidence",
        url: "https://example.com/proof.pdf",
        contentHash: "sha256-abc12345",
        note: "x".repeat(1001),
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional txHash when valid", () => {
      const result = proofSchema.safeParse({
        proofType: "evidence",
        url: "https://example.com/proof.pdf",
        contentHash: "sha256-abc12345",
        txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid txHash format", () => {
      const result = proofSchema.safeParse({
        proofType: "evidence",
        url: "https://example.com/proof.pdf",
        contentHash: "sha256-abc12345",
        txHash: "not-a-hex-hash",
      });
      expect(result.success).toBe(false);
    });
  });
});
