import { describe, it, expect } from "vitest";
import { mapMarket } from "@/lib/admin";

describe("admin", () => {
  describe("mapMarket", () => {
    it("replaces underscores with spaces", () => {
      expect(mapMarket("mini_apps")).toBe("mini apps");
      expect(mapMarket("x_accounts")).toBe("x accounts");
    });

    it("returns 'Escrow' for falsy values", () => {
      expect(mapMarket(null)).toBe("Escrow");
      expect(mapMarket(undefined)).toBe("Escrow");
      expect(mapMarket("")).toBe("Escrow");
    });
  });
});
