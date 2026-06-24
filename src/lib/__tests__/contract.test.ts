import { describe, it, expect } from "vitest";
import { parseContractError } from "@/lib/contract";

describe("contract", () => {
  describe("parseContractError", () => {
    it("returns user-friendly message for user rejected error", () => {
      const err = new Error("User rejected the request.");
      expect(parseContractError(err)).toContain("rejected");
    });

    it("returns user-friendly message for insufficient funds", () => {
      const err = new Error("insufficient funds for gas");
      expect(parseContractError(err)).toContain("Insufficient");
    });

    it("returns generic message for unknown errors", () => {
      const err = new Error("something weird happened");
      const result = parseContractError(err);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("handles non-Error objects", () => {
      const result = parseContractError("just a string");
      expect(typeof result).toBe("string");
      expect(result).toBeTruthy();
    });

    it("handles null/undefined", () => {
      expect(typeof parseContractError(null)).toBe("string");
      expect(typeof parseContractError(undefined)).toBe("string");
    });

    it("handles contract revert messages", () => {
      const err = new Error("execution reverted: ERC721: transfer caller is not owner nor approved");
      expect(parseContractError(err)).toContain("not owner");
    });

    it("handles user denied signature", () => {
      const err = new Error("User denied message signature.");
      expect(parseContractError(err)).toContain("rejected");
    });
  });
});
