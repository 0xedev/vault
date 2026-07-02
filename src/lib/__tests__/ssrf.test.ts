import { describe, it, expect } from "vitest";
import { assertSafeUrl } from "@/lib/ssrf";

describe("ssrf", () => {
  describe("assertSafeUrl", () => {
    it("allows valid public HTTP URL", async () => {
      await expect(assertSafeUrl("https://example.com/test")).resolves.toBeUndefined();
    });

    it("rejects localhost URLs", async () => {
      await expect(assertSafeUrl("http://localhost:3000/admin")).rejects.toThrow();
      await expect(assertSafeUrl("http://127.0.0.1:8080/api")).rejects.toThrow();
      await expect(assertSafeUrl("http://0.0.0.0:80")).rejects.toThrow();
    });

    it("rejects non-HTTP schemes", async () => {
      await expect(assertSafeUrl("file:///etc/passwd")).rejects.toThrow("Only http/https URLs are allowed");
      await expect(assertSafeUrl("ftp://example.com")).rejects.toThrow();
    });

    it("rejects invalid URLs", async () => {
      await expect(assertSafeUrl("not-a-url")).rejects.toThrow();
      await expect(assertSafeUrl("")).rejects.toThrow();
    });

    it("rejects metadata endpoint", async () => {
      await expect(assertSafeUrl("http://metadata.google.internal/")).rejects.toThrow();
      await expect(assertSafeUrl("http://169.254.169.254/latest/meta-data/")).rejects.toThrow();
    });

    it("allows public IP addresses", async () => {
      await expect(assertSafeUrl("http://1.1.1.1")).resolves.toBeUndefined();
      await expect(assertSafeUrl("https://8.8.8.8")).resolves.toBeUndefined();
    });

    it("rejects private IP ranges", async () => {
      await expect(assertSafeUrl("http://10.0.0.1")).rejects.toThrow("Private IP");
      await expect(assertSafeUrl("http://192.168.1.1")).rejects.toThrow("Private IP");
      await expect(assertSafeUrl("http://172.16.0.1")).rejects.toThrow("Private IP");
      await expect(assertSafeUrl("http://100.64.0.1")).rejects.toThrow("Private IP");
      await expect(assertSafeUrl("http://[::1]/")).rejects.toThrow("Private IP");
      await expect(assertSafeUrl("http://[::ffff:127.0.0.1]/")).rejects.toThrow("Private IP");
      await expect(assertSafeUrl("http://[fd00::1]/")).rejects.toThrow("Private IP");
      await expect(assertSafeUrl("http://[fe80::1]/")).rejects.toThrow("Private IP");
    });
  });
});
