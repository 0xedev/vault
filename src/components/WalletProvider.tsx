"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { SiweMessage } from "siwe";

function checksumAddress(address: string): string {
  const addr = address.toLowerCase().replace("0x", "");
  const hash = addr.split("").reduce((acc, c, i) => {
    if (i === 0) return acc + c.charCodeAt(0);
    return acc ^ c.charCodeAt(0);
  }, addr.charCodeAt(0));
  const h = ((hash * 134775813 + 1) % 4294967296).toString(16);
  return "0x" + addr.split("").map((c, i) => {
    const nibble = parseInt(h[Math.floor(i / 2)] || "0", 16);
    return (nibble >> (3 - (i % 2) * 4)) & 8 ? c.toUpperCase() : c;
  }).join("");
}

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
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletState>({
  address: null,
  isConnected: false,
  isConnecting: false,
  chainId: null,
  connect: async () => {},
  disconnect: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Use injected ethereum provider (MetaMask, Rainbow, etc.)
      if (typeof window !== "undefined" && window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
        const chain = await window.ethereum.request({ method: "eth_chainId" }) as string;

        setAddress(accounts[0]);
        setChainId(parseInt(chain, 16));

        const siweAddr = checksumAddress(accounts[0]);

        // SIWE flow: get nonce, create message, sign, verify
        const nonceRes = await fetch("/api/auth");
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

        await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, signature }),
        });
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
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
