import { describe, it, expect } from "vitest";
import { shortAddress, relativeDeadline, stageLabel, asNumber, asString, asBoolean, jsonRecord, jsonArray } from "@/lib/api";

describe("api helpers", () => {
  describe("shortAddress", () => {
    it("formats Ethereum addresses", () => {
      expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234...5678");
    });

    it("returns short values unchanged", () => {
      expect(shortAddress("short")).toBe("short");
    });
  });

  describe("relativeDeadline", () => {
    it("returns 'Overdue' for past dates", () => {
      const past = new Date(Date.now() - 3600000).toISOString();
      expect(relativeDeadline(past)).toBe("Overdue");
    });

    it("returns human-readable future times", () => {
      const future = new Date(Date.now() + 3600000).toISOString();
      expect(relativeDeadline(future)).toMatch(/in \d+h/);
    });

    it("handles null/undefined", () => {
      expect(relativeDeadline(null)).toBe("No deadline");
      expect(relativeDeadline(undefined)).toBe("No deadline");
    });

    it("handles invalid dates", () => {
      expect(relativeDeadline("not-a-date")).toBe("No deadline");
    });
  });

  describe("stageLabel", () => {
    it("maps known stages", () => {
      expect(stageLabel("funds_locked")).toBe("Funds locked");
      expect(stageLabel("awaiting_deposit")).toBe("Awaiting deposit");
      expect(stageLabel("released")).toBe("Released");
      expect(stageLabel("refunded")).toBe("Refunded");
    });

    it("title-cases unknown stages", () => {
      expect(stageLabel("custom_stage")).toBe("Custom Stage");
    });
  });

  describe("asNumber", () => {
    it("parses numbers", () => {
      expect(asNumber("42")).toBe(42);
      expect(asNumber(3.14)).toBe(3.14);
    });

    it("returns fallback for invalid", () => {
      expect(asNumber("abc")).toBe(0);
      expect(asNumber("abc", 99)).toBe(99);
      expect(asNumber(null)).toBe(0);
    });
  });

  describe("asString", () => {
    it("returns strings as-is", () => {
      expect(asString("hello")).toBe("hello");
    });

    it("returns fallback for non-strings", () => {
      expect(asString(42)).toBe("");
      expect(asString(42, "nope")).toBe("nope");
    });
  });

  describe("asBoolean", () => {
    it("returns booleans as-is", () => {
      expect(asBoolean(true)).toBe(true);
      expect(asBoolean(false)).toBe(false);
    });

    it("returns fallback for non-booleans", () => {
      expect(asBoolean("true")).toBe(false);
      expect(asBoolean(1, true)).toBe(true);
    });
  });

  describe("jsonRecord", () => {
    it("parses JSON strings to objects", () => {
      expect(jsonRecord('{"key":"val"}')).toEqual({ key: "val" });
    });

    it("returns empty object for invalid JSON", () => {
      expect(jsonRecord("{bad}")).toEqual({});
      expect(jsonRecord(null)).toEqual({});
      expect(jsonRecord(undefined)).toEqual({});
    });

    it("returns existing objects as-is", () => {
      const obj = { a: 1 };
      expect(jsonRecord(obj)).toBe(obj);
    });

    it("returns empty for arrays", () => {
      expect(jsonRecord([1, 2, 3])).toEqual({});
    });
  });

  describe("jsonArray", () => {
    it("parses JSON string arrays", () => {
      expect(jsonArray('[1,2,3]')).toEqual([1, 2, 3]);
    });

    it("returns existing arrays as-is", () => {
      const arr = [1, 2];
      expect(jsonArray(arr)).toBe(arr);
    });

    it("returns empty array for invalid", () => {
      expect(jsonArray("not-json")).toEqual([]);
      expect(jsonArray(null)).toEqual([]);
    });
  });
});
