"use client";

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base } from "@reown/appkit/networks";
import { connect, getAccount } from "@wagmi/core";

type ConnectConfig = Parameters<typeof connect>[0];

interface AccountLike {
  address?: string;
  chainId?: number;
  connector?: { getProvider: () => Promise<unknown> };
}

type WalletProviderLike = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
};

const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ||
  "b56e18d47c72ab683b10814fe9495694";
const networks = [base];

interface WagmiConfigLike {
  connectors: Array<{
    getProvider: () => Promise<unknown>;
  }>;
}

export const wagmiAdapter = new WagmiAdapter({ networks, projectId });

export const appkitModal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: "Vault",
    description: "Baseshire Vault",
    url: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
    icons: [],
  },
});

export async function connectReownAppKitWallet() {
  const config = (wagmiAdapter as unknown as { wagmiConfig?: WagmiConfigLike })
    .wagmiConfig;
  if (!config) return null;

  const connected = await connect(config as unknown as ConnectConfig, {
    connector: config.connectors[0],
  }).catch(() => null);

  const accountAfter = getAccount(
    config as unknown as ConnectConfig,
  ) as AccountLike;
  const connector =
    (accountAfter && accountAfter.connector) || config.connectors[0];
  const provider = await connector.getProvider();

  const connectedAccounts = (connected as unknown as { accounts?: string[] })
    ?.accounts;
  const connectedChainId = (connected as unknown as { chainId?: number })
    ?.chainId;

  return {
    address: connectedAccounts?.[0] || accountAfter.address,
    chainId: connectedChainId || accountAfter.chainId,
    provider: provider as WalletProviderLike,
  };
}

export async function reconnectReownAppKitWallet() {
  const config = (wagmiAdapter as unknown as { wagmiConfig?: WagmiConfigLike })
    .wagmiConfig;
  if (!config) return null;
  try {
    const connector = config.connectors[0];
    const provider = await connector.getProvider();
    const accountAfter = getAccount(
      config as unknown as ConnectConfig,
    ) as AccountLike;
    if (!accountAfter?.address) return null;
    return {
      address: accountAfter.address,
      chainId: accountAfter.chainId,
      provider: provider as WalletProviderLike,
    };
  } catch {
    return null;
  }
}
