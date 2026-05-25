import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function deriveKey(escrowId: string): Buffer {
  const secret = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("MESSAGE_ENCRYPTION_KEY is required for encrypted deal messages.");
  }
  return scryptSync(secret, escrowId, 32);
}

export function encryptMessage(escrowId: string, plaintext: string): string {
  const key = deriveKey(escrowId);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

export function decryptMessage(escrowId: string, ciphertext: string): string {
  const key = deriveKey(escrowId);
  const combined = Buffer.from(ciphertext, "base64");
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
