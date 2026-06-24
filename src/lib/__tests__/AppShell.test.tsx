import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import React from "react";

const server = setupServer();

beforeEach(() => {
  server.resetHandlers();
  server.use(
    http.get("http://localhost/api/auth/session", () => {
      return HttpResponse.json({ user: null });
    }),
  );
});
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement("a", props, children),
}));

// Ensure window.ethereum is undefined for tests
beforeEach(() => {
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "ethereum", { value: undefined, writable: true, configurable: true });
  }
});

afterEach(() => {
  cleanup();
});

describe("AppShell", () => {
  it("renders without crashing", async () => {
    const { default: AppShell } = await import("@/components/AppShell");
    render(<AppShell><div>Content</div></AppShell>);
    expect(screen.getByText("Content")).toBeTruthy();
  }, 15000);

  it("renders children inside main", async () => {
    const { default: AppShell } = await import("@/components/AppShell");
    render(<AppShell><h1>Test Heading</h1></AppShell>);
    expect(screen.getByText("Test Heading")).toBeTruthy();
  }, 15000);
});
