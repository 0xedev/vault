import { describe, expect, it } from "vitest";
import { marketplaceListingSchema } from "@/app/api/marketplace/[kind]/route";

describe("marketplace listing validation", () => {
  it("accepts null descriptions for listings that omit a description", () => {
    const result = marketplaceListingSchema.safeParse({
      sellerAddress: "0x1111111111111111111111111111111111111111",
      title: "@alice",
      price: 12,
      description: null,
      data: { handle: "@alice" },
    });

    expect(result.success).toBe(true);
  });
});
