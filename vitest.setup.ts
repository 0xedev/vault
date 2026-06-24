import "@testing-library/jest-dom/vitest";

process.env.MESSAGE_ENCRYPTION_KEY =
  process.env.MESSAGE_ENCRYPTION_KEY ||
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
