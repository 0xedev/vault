"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { SiweMessage } from "siwe";
import { getAddress } from "viem";
import { isMiniApp, signInWithFarcaster } from "@/lib/farcaster-sdk";
import {
  connectFarcasterMiniAppWallet,
  disconnectFarcasterMiniAppWallet,
  reconnectFarcasterMiniAppWallet,
} from "@/lib/farcaster-wagmi";
import { setActiveWalletProvider } from "@/lib/contract-helpers";
import { logClientError } from "@/lib/client-log";

type WalletLike = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
};

type SelectedWallet = {
  provider: WalletLike;
  address?: string;
  chainId?: number;
};

declare global {
  interface Window {
    ethereum?: WalletLike;
  }
}

type WalletState = {
  address: string | null;
  sessionAddress: string | null;
  role: "user" | "admin" | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  isConnecting: boolean;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletState>({
  address: null,
  sessionAddress: null,
  role: null,
  isConnected: false,
  isAuthenticated: false,
  isConnecting: false,
  chainId: null,
  connect: async () => {},
  disconnect: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

async function selectWalletProvider(
  options: { requestAccounts?: boolean } = {},
): Promise<SelectedWallet | null> {
  if (typeof window === "undefined") return null;

  const inMiniApp = await isMiniApp();
  if (inMiniApp) {
    try {
      const wallet = options.requestAccounts
        ? await connectFarcasterMiniAppWallet()
        : await reconnectFarcasterMiniAppWallet();
      if (wallet) return wallet;
      logClientError("wallet:selectWalletProvider:mini-app-no-wallet", "Mini app wallet returned null", { requestAccounts: !!options.requestAccounts });
      return null;
    } catch (err) {
      logClientError("wallet:selectWalletProvider:mini-app-exception", err);
      console.warn("Farcaster Mini App wallet unavailable:", err);
      return null;
    }
  }

  // Fallback: browser-injected wallet outside Mini App
  if (window.ethereum) {
    return { provider: window.ethereum };
  }

  return null;
}

async function siweSignIn(
  address: string,
  chainId: number,
  provider: WalletLike,
): Promise<{ address: string; role: string } | null> {
  try {
    const nonceRes = await fetch("/api/auth/nonce");
    const { nonce } = await nonceRes.json();
    if (!nonce) return null;

    const siweAddr = getAddress(address);
    const message = new SiweMessage({
      domain: window.location.host,
      address: siweAddr,
      statement: "Sign in to Baseshire Hethaway.",
      uri: window.location.origin,
      version: "1",
      chainId,
      nonce,
    });

    const signature = await provider.request({
      method: "personal_sign",
      params: [message.prepareMessage(), address],
    });

    const verifyRes = await fetch("/api/auth/verify", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });
    if (!verifyRes.ok) return null;
    return verifyRes.json();
  } catch {
    return null;
  }
}

async function farcasterSignIn(
  options: { force?: boolean } = {},
): Promise<{ address: string; role: string } | null> {
  try {
    const result = await signInWithFarcaster(options);
    if (!result?.token) {
      logClientError("wallet:farcasterSignIn:no-token", "signInWithFarcaster returned no token", { force: !!options.force });
      return null;
    }

    const verifyRes = await fetch("/api/auth/farcaster", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: result.token,
      }),
    });
    if (!verifyRes.ok) {
      const json = await verifyRes.json().catch(() => ({}));
      logClientError("wallet:farcasterSignIn:verify-failed", json.error || `status ${verifyRes.status}`, { status: verifyRes.status });
      console.warn(
        "Vault Farcaster sign-in verification failed:",
        json.error || verifyRes.statusText,
      );
      return null;
    }

    return verifyRes.json();
  } catch (err) {
    logClientError("wallet:farcasterSignIn:exception", err);
    console.warn("Vault Farcaster sign-in failed:", err);
    return null;
  }
}

function isEvmAddress(address: string | null | undefined): address is `0x${string}` {
  return typeof address === "string" && /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const [role, setRole] = useState<"user" | "admin" | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const attachWallet = useCallback(async (options: { requestAccounts?: boolean } = {}) => {
    const wallet = await selectWalletProvider(options);
    if (!wallet) {
      logClientError("wallet:attachWallet:no-provider", "selectWalletProvider returned null", { requestAccounts: !!options.requestAccounts });
      return null;
    }
    setActiveWalletProvider(wallet.provider);

    const accounts = wallet.address
      ? [wallet.address]
      : ((await wallet.provider.request({
          method: options.requestAccounts ? "eth_requestAccounts" : "eth_accounts",
        })) as string[]);
    if (!Array.isArray(accounts) || !isEvmAddress(accounts[0])) {
      logClientError("wallet:attachWallet:no-accounts", "No valid accounts returned", { isArray: Array.isArray(accounts) });
      return null;
    }

    const chainIdNum =
      wallet.chainId ??
      parseInt(
        (await wallet.provider.request({
          method: "eth_chainId",
        })) as string,
        16,
      );

    setAddress(accounts[0]);
    setChainId(chainIdNum);
    return { address: accounts[0], chainId: chainIdNum, provider: wallet.provider };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    (async () => {
      const inMiniApp = await isMiniApp();
      let hasSession = false;

      // 1. Try session cookie first
      try {
        const res = await fetch("/api/auth/session");
        const json = await res.json();
        if (json?.user?.address) {
          setSessionAddress(json.user.address);
          if (isEvmAddress(json.user.address)) setAddress(json.user.address);
          setRole(json.user.role === "admin" ? "admin" : "user");
          hasSession = true;
        }
      } catch {
        /* */
      }

      if (inMiniApp) {
        setIsConnecting(true);
        try {
          await attachWallet({ requestAccounts: true }).catch(() => null);
          if (!hasSession) {
            const session = await farcasterSignIn();
            if (session) {
              setSessionAddress(session.address);
              setRole(session.role === "admin" ? "admin" : "user");
            }
          }
        } finally {
          setIsConnecting(false);
        }
        return;
      }

      if (hasSession) return;

      // 2. No session — auto-connect injected wallet outside Mini App
      try {
        const wallet = await attachWallet();
        if (wallet) {
          const session = await siweSignIn(
            wallet.address,
            wallet.chainId,
            wallet.provider,
          );
          if (session) {
            setSessionAddress(session.address);
            setRole(session.role === "admin" ? "admin" : "user");
          }
        }
      } catch {
        /* */
      }
    })();
  }, [attachWallet]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      if (await isMiniApp()) {
        const session = await farcasterSignIn({ force: true });
        if (!session) throw new Error("Farcaster sign-in did not complete");

        const wallet = await attachWallet({ requestAccounts: true });
        if (!wallet) throw new Error("Mini App wallet connection did not complete");

        setSessionAddress(session.address);
        setRole(session.role === "admin" ? "admin" : "user");
        return;
      }

      const wallet = await attachWallet({ requestAccounts: true });
      if (!wallet) throw new Error("No wallet available");

      const session = await siweSignIn(
        wallet.address,
        wallet.chainId,
        wallet.provider,
      );
      if (session) {
        setSessionAddress(session.address);
        setRole(session.role === "admin" ? "admin" : "user");
      }
    } catch (err) {
      logClientError("wallet:connect:exception", err);
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [attachWallet]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setSessionAddress(null);
    setRole(null);
    setChainId(null);
    setActiveWalletProvider(null);
    disconnectFarcasterMiniAppWallet();
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(
      () => {},
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    let active = true;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
        return;
      }
      if (!isEvmAddress(accounts[0])) return;
      setActiveWalletProvider(window.ethereum!);
      setAddress(accounts[0]);
      setSessionAddress(null);
      setRole(null);
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
        const chain = (await window.ethereum!.request({
          method: "eth_chainId",
        })) as string;
        const chainIdNum = parseInt(chain, 16);
        setChainId(chainIdNum);
        const session = await siweSignIn(
          accounts[0],
          chainIdNum,
          window.ethereum!,
        );
        if (session) {
          setSessionAddress(session.address);
          setAddress(accounts[0]);
          setRole(session.role === "admin" ? "admin" : "user");
        }
      } catch {
        setRole(null);
      }
    };

    const handleChainChanged = (chain: string) =>
      setChainId(parseInt(chain, 16));

    void isMiniApp().then((inMiniApp) => {
      if (!active || inMiniApp) return;
      window.ethereum?.on?.(
        "accountsChanged",
        handleAccountsChanged as (...args: unknown[]) => void,
      );
      window.ethereum?.on?.(
        "chainChanged",
        handleChainChanged as (...args: unknown[]) => void,
      );
    });

    return () => {
      active = false;
      window.ethereum?.removeListener?.(
        "accountsChanged",
        handleAccountsChanged as (...args: unknown[]) => void,
      );
      window.ethereum?.removeListener?.(
        "chainChanged",
        handleChainChanged as (...args: unknown[]) => void,
      );
    };
  }, [disconnect]);

  return (
    <WalletContext.Provider
      value={{
        address,
        sessionAddress,
        role,
        isConnected: !!address,
        isAuthenticated: !!role,
        isConnecting,
        chainId,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
