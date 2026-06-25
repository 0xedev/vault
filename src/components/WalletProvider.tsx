"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { SiweMessage } from "siwe";
import { getAddress } from "viem";
import { isMiniApp, signInWithFarcaster } from "@/lib/farcaster-sdk";
import { connectFarcasterMiniAppWallet, disconnectFarcasterMiniAppWallet, reconnectFarcasterMiniAppWallet } from "@/lib/farcaster-wagmi";
import { setActiveWalletProvider } from "@/lib/contract-helpers";

type WalletLike = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

type SelectedWallet = {
  provider: WalletLike;
  address?: string;
  chainId?: number;
};

// Extend Window type
declare global {
  interface Window {
    ethereum?: WalletLike;
  }
}

type WalletState = {
  address: string | null;
  role: "user" | "admin" | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletState>({
  address: null,
  role: null,
  isConnected: false,
  isConnecting: false,
  chainId: null,
  connect: async () => {},
  disconnect: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

async function selectWalletProvider(options: { requestAccounts?: boolean } = {}): Promise<SelectedWallet | null> {
  const inMini = await isMiniApp();
  if (inMini) {
    const wallet = options.requestAccounts
      ? await connectFarcasterMiniAppWallet()
      : await reconnectFarcasterMiniAppWallet();
    if (wallet) return wallet;
    return null;
  }

  if (typeof window !== "undefined" && window.ethereum) {
    return { provider: window.ethereum };
  }

  return null;
}

async function verifySignedMessage(message: unknown, signature: unknown): Promise<{ address: string; role: string } | null> {
  const verifyRes = await fetch("/api/auth/verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, signature }),
  });
  if (!verifyRes.ok) {
    const json = await verifyRes.json().catch(() => ({}));
    console.warn("Vault sign-in verification failed:", json.error || verifyRes.statusText);
    return null;
  }
  return verifyRes.json();
}

async function verifyFarcasterSignIn(message: unknown, signature: unknown): Promise<{ address: string; role: string } | null> {
  const verifyRes = await fetch("/api/auth/farcaster", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, signature }),
  });
  if (!verifyRes.ok) {
    const json = await verifyRes.json().catch(() => ({}));
    console.warn("Vault Farcaster sign-in verification failed:", json.error || verifyRes.statusText);
    return null;
  }
  return verifyRes.json();
}

async function vaultSignIn(address: string, chainId: number, provider: WalletLike): Promise<{ address: string; role: string } | null> {
  try {
    const nonceRes = await fetch("/api/auth/nonce");
    const { nonce } = await nonceRes.json();

    if (await isMiniApp()) {
      const result = await signInWithFarcaster(nonce);
      if (!result) return null;
      return verifyFarcasterSignIn(result.message, result.signature);
    }

    const siweAddr = getAddress(address);
    const message = new SiweMessage({
      domain: window.location.host,
      address: siweAddr,
      statement: "Sign in to Vault.",
      uri: window.location.origin,
      version: "1",
      chainId,
      nonce,
    });

    // In Mini App mode this still goes through Farcaster's SDK wallet provider,
    // so the session is bound to the user's primary wallet instead of an auth signer.
    const signature = await provider.request({
      method: "personal_sign",
      params: [message.prepareMessage(), address],
    });
    return verifySignedMessage(message, signature);
  } catch (err) {
    console.warn("Vault sign-in failed:", err);
    return null;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [role, setRole] = useState<"user" | "admin" | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // On mount, restore session then auto-auth if wallet is already connected
  useEffect(() => {
    if (typeof window === "undefined") return;

    (async () => {
      // 1. Try session cookie first (fast path, no wallet needed)
      try {
        const res = await fetch("/api/auth/session");
        const json = await res.json();
        if (json?.user?.address) {
          setAddress(json.user.address);
          setRole(json.user.role === "admin" ? "admin" : "user");
          return;
        }
      } catch { /* */ }

      // 2. No session — use Farcaster SDK first inside Mini App, otherwise injected wallet
      const wallet = await selectWalletProvider();
      if (!wallet) return;
      setActiveWalletProvider(wallet.provider);

      try {
        const accounts = wallet.address
          ? [wallet.address]
          : await wallet.provider.request({ method: "eth_accounts" }) as string[];
        if (Array.isArray(accounts) && accounts.length > 0) {
          const chainIdNum = wallet.chainId ?? parseInt(await wallet.provider.request({ method: "eth_chainId" }) as string, 16);
          setAddress(accounts[0]);
          setChainId(chainIdNum);

          const session = await vaultSignIn(accounts[0], chainIdNum, wallet.provider);
          if (session) {
            setAddress(session.address || accounts[0]);
            setRole(session.role === "admin" ? "admin" : "user");
          }
        }
      } catch { /* */ }
    })();
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const wallet = await selectWalletProvider({ requestAccounts: true });
      if (!wallet) throw new Error("No wallet available");
      setActiveWalletProvider(wallet.provider);

      const accounts = wallet.address
        ? [wallet.address]
        : await wallet.provider.request({ method: "eth_requestAccounts" }) as string[];
      const chainIdNum = wallet.chainId ?? parseInt(await wallet.provider.request({ method: "eth_chainId" }) as string, 16);
      setAddress(accounts[0]);
      setChainId(chainIdNum);

      const session = await vaultSignIn(accounts[0], chainIdNum, wallet.provider);
      if (session) {
        setAddress(session.address || accounts[0]);
        setRole(session.role === "admin" ? "admin" : "user");
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setRole(null);
    setChainId(null);
    setActiveWalletProvider(null);
    disconnectFarcasterMiniAppWallet();
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    let active = true;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
        return;
      }

      const nextAddress = accounts[0];
      setActiveWalletProvider(window.ethereum!);
      setAddress(nextAddress);
      setRole(null);

      try {
        await fetch("/api/auth/logout", { method: "POST" });
        const chain = await window.ethereum!.request({ method: "eth_chainId" }) as string;
        const chainIdNum = parseInt(chain, 16);
        setChainId(chainIdNum);
        const session = await vaultSignIn(nextAddress, chainIdNum, window.ethereum!);
        if (session) {
          setAddress(session.address || nextAddress);
          setRole(session.role === "admin" ? "admin" : "user");
        }
      } catch {
        setRole(null);
      }
    };

    const handleChainChanged = (chain: string) => {
      setChainId(parseInt(chain, 16));
    };

    void isMiniApp().then((inMini) => {
      if (!active || inMini) return;
      window.ethereum?.on?.("accountsChanged", handleAccountsChanged as (...args: unknown[]) => void);
      window.ethereum?.on?.("chainChanged", handleChainChanged as (...args: unknown[]) => void);
    });

    return () => {
      active = false;
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged as (...args: unknown[]) => void);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged as (...args: unknown[]) => void);
    };
  }, [disconnect]);

  return (
    <WalletContext.Provider
      value={{
        address,
        role,
        isConnected: !!address,
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
