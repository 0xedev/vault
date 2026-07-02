import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { WalletProvider, useWallet } from "@/components/WalletProvider";
import { setupServer } from "msw/node";
import React from "react";

vi.mock("@/lib/farcaster-sdk", () => ({
  isMiniApp: vi.fn(async () => false),
  signInWithFarcaster: vi.fn(async () => null),
}));

vi.mock("@/lib/farcaster-wagmi", () => ({
  connectFarcasterMiniAppWallet: vi.fn(async () => null),
  disconnectFarcasterMiniAppWallet: vi.fn(),
  reconnectFarcasterMiniAppWallet: vi.fn(async () => null),
}));

vi.mock("@/lib/reown-appkit", () => ({
  connectReownAppKitWallet: vi.fn(async () => null),
  reconnectReownAppKitWallet: vi.fn(async () => null),
}));

vi.mock("@/lib/contract-helpers", () => ({
  getActiveWalletProvider: vi.fn(() => null),
  setActiveWalletProvider: vi.fn(),
}));

const server = setupServer();

beforeEach(() => server.resetHandlers());
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WalletProvider>{children}</WalletProvider>
);

describe("WalletProvider", () => {
  it("provides default unconnected state", () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(result.current.role).toBeNull();
  });

  it("calls disconnect without error", () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    act(() => {
      result.current.disconnect();
    });
    expect(result.current.isConnected).toBe(false);
  });

  it("has connect function available", () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    expect(typeof result.current.connect).toBe("function");
    expect(result.current.isConnecting).toBe(false);
  });
});
