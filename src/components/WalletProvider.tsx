"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { SiweMessage } from "siwe";
import { getAddress } from "viem";


// Extend Window type
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
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

async function siweSignIn(address: string, chainId: number): Promise<{ address: string; role: string } | null> {
  try {
    const siweAddr = getAddress(address);
    const nonceRes = await fetch("/api/auth/nonce");
    const { nonce } = await nonceRes.json();

    const message = new SiweMessage({
      domain: window.location.host,
      address: siweAddr,
      statement: "Sign in to Vault.",
      uri: window.location.origin,
      version: "1",
      chainId,
      nonce,
    });

    const signature = await window.ethereum!.request({
      method: "personal_sign",
      params: [message.prepareMessage(), address],
    });

    const verifyRes = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });
    if (!verifyRes.ok) return null;
    return verifyRes.json();
  } catch {
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
          return; // Already authenticated via session
        }
      } catch { /* */ }

      // 2. No session — check if wallet is already connected
      if (!window.ethereum) return;
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" }) as string[];
        if (Array.isArray(accounts) && accounts.length > 0) {
          const chain = await window.ethereum.request({ method: "eth_chainId" }) as string;
          const chainIdNum = parseInt(chain, 16);
          setAddress(accounts[0]);
          setChainId(chainIdNum);

          // 3. Auto SIWE — wallet connected but no session
          const session = await siweSignIn(accounts[0], chainIdNum);
          if (session) {
            setRole(session.role === "admin" ? "admin" : "user");
          }
        }
      } catch { /* */ }
    })();
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
        const chain = await window.ethereum.request({ method: "eth_chainId" }) as string;
        const chainIdNum = parseInt(chain, 16);
        setAddress(accounts[0]);
        setChainId(chainIdNum);

        const session = await siweSignIn(accounts[0], chainIdNum);
        if (session) {
          setAddress(session.address || accounts[0]);
          setRole(session.role === "admin" ? "admin" : "user");
        }
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
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
        return;
      }

      const nextAddress = accounts[0];
      setAddress(nextAddress);
      setRole(null);

      try {
        await fetch("/api/auth/logout", { method: "POST" });
        const chain = await window.ethereum!.request({ method: "eth_chainId" }) as string;
        const chainIdNum = parseInt(chain, 16);
        setChainId(chainIdNum);
        const session = await siweSignIn(nextAddress, chainIdNum);
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

    window.ethereum.on("accountsChanged", handleAccountsChanged as (...args: unknown[]) => void);
    window.ethereum.on("chainChanged", handleChainChanged as (...args: unknown[]) => void);

    return () => {
      window.ethereum!.removeListener("accountsChanged", handleAccountsChanged as (...args: unknown[]) => void);
      window.ethereum!.removeListener("chainChanged", handleChainChanged as (...args: unknown[]) => void);
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
