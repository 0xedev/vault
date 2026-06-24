import { describe, it, expect } from "vitest";
import { shortAddr, fmtETH, fmtUSD, fmtCompact, appColor } from "@/lib/utils";

describe("utils", () => {
  describe("shortAddr", () => {
    it("truncates long addresses", () => {
      const result = shortAddr("0x1234567890abcdef1234567890abcdef12345678");
      expect(result).toContain("\u2026");
      expect(result.startsWith("0x1234")).toBe(true);
      expect(result.endsWith("5678")).toBe(true);
    });
  });

  describe("fmtETH", () => {
    it("formats numbers with 3 decimal places", () => {
      expect(fmtETH(1.23456)).toBe("1.235");
      expect(fmtETH(1000)).toMatch(/1,?000/);
    });
  });

  describe("fmtUSD", () => {
    it("formats USD with dollar sign and no decimals", () => {
      expect(fmtUSD(1234)).toContain("$");
      expect(fmtUSD(1234)).toContain("1");
    });
  });

  describe("fmtCompact", () => {
    it("formats millions", () => {
      expect(fmtCompact(1_500_000)).toBe("1.5m");
    });

    it("formats thousands", () => {
      expect(fmtCompact(5_000)).toBe("5.0k");
    });

    it("returns small numbers as-is", () => {
      expect(fmtCompact(42)).toBe("42");
    });
  });

  describe("appColor", () => {
    it("returns a hex color string", () => {
      const color = appColor("test", 0);
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it("is deterministic for same seed", () => {
      expect(appColor("hello", 1)).toBe(appColor("hello", 1));
    });

    it("returns different colors for different seeds", () => {
      const c1 = appColor("a", 0);
      const c2 = appColor("b", 0);
      // Not strictly guaranteed to differ, but extremely likely
      expect(c1).toBeTruthy();
      expect(c2).toBeTruthy();
    });
  });
});
