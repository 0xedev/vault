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

const STORAGE_KEY = "vault-wallet";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [role, setRole] = useState<"user" | "admin" | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // On mount, restore wallet + server session if already authorized.
  useEffect(() => {
    if (typeof window === "undefined") return;
    fetch("/api/auth/session")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json?.user?.address) {
          setAddress(json.user.address);
          setRole(json.user.role === "admin" ? "admin" : "user");
        }
      })
      .catch(() => {});

    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      if (Array.isArray(accounts) && accounts.length > 0) {
        setAddress(accounts[0]);
        try { localStorage.setItem(STORAGE_KEY, accounts[0]); } catch {}
        window.ethereum!.request({ method: "eth_chainId" }).then((chain: unknown) => {
          setChainId(parseInt(chain as string, 16));
        });
      } else {
        setAddress(null);
        setRole(null);
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
      }
    }).catch(() => {});
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Use injected ethereum provider (MetaMask, Rainbow, etc.)
      if (typeof window !== "undefined" && window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
        const chain = await window.ethereum.request({ method: "eth_chainId" }) as string;

        setAddress(accounts[0]);
        setChainId(parseInt(chain, 16));
        try { localStorage.setItem(STORAGE_KEY, accounts[0]); } catch {}

        const siweAddr = getAddress(accounts[0]);

        // SIWE flow: get nonce, create message, sign, verify
        const nonceRes = await fetch("/api/auth/nonce");
        const { nonce } = await nonceRes.json();

        const message = new SiweMessage({
          domain: window.location.host,
          address: siweAddr,
          statement: "Sign in to Vault.",
          uri: window.location.origin,
          version: "1",
          chainId: parseInt(chain, 16),
          nonce,
        });

        const signature = await window.ethereum.request({
          method: "personal_sign",
          params: [message.prepareMessage(), accounts[0]],
        });

        const verifyRes = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, signature }),
        });
        if (!verifyRes.ok) throw new Error("SIWE verification failed");
        const session = await verifyRes.json();
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
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) disconnect();
      else setAddress(accounts[0]);
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
