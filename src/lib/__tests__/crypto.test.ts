import { describe, it, expect } from "vitest";
import { encryptMessage, decryptMessage } from "@/lib/crypto";

const escrowId = "escrow-test-1";

describe("crypto", () => {
  it("encrypts and decrypts a message round-trip", () => {
    const plaintext = "Hello, this is a test message for escrow chat.";
    const encrypted = encryptMessage(escrowId, plaintext);
    expect(encrypted).toBeTruthy();
    expect(typeof encrypted).toBe("string");
    expect(encrypted).not.toBe(plaintext);

    const decrypted = decryptMessage(escrowId, encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for same plaintext (unique IV)", () => {
    const plaintext = "same message";
    const e1 = encryptMessage(escrowId, plaintext);
    const e2 = encryptMessage(escrowId, plaintext);
    expect(e1).not.toBe(e2);
  });

  it("produces deterministic keys for the same escrow ID", () => {
    const plaintext = "deterministic test";
    const encrypted = encryptMessage(escrowId, plaintext);
    const decrypted = decryptMessage(escrowId, encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("fails to decrypt with a different escrow ID", () => {
    const plaintext = "secret";
    const encrypted = encryptMessage(escrowId, plaintext);
    expect(() => decryptMessage("other-escrow", encrypted)).toThrow();
  });

  it("handles empty strings", () => {
    const encrypted = encryptMessage(escrowId, "");
    expect(encrypted).toBeTruthy();
    expect(decryptMessage(escrowId, encrypted)).toBe("");
  });

  it("handles unicode characters", () => {
    const plaintext = "Hello 世界 🌍\nwith newlines and emoji 🎉";
    const encrypted = encryptMessage(escrowId, plaintext);
    expect(decryptMessage(escrowId, encrypted)).toBe(plaintext);
  });

  it("handles long messages", () => {
    const plaintext = "x".repeat(10000);
    const encrypted = encryptMessage(escrowId, plaintext);
    expect(decryptMessage(escrowId, encrypted)).toBe(plaintext);
  });
});
