"use client";

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { getAccount } from "@wagmi/core";
import type { Config, Connector } from "wagmi";

type GetAccountConfig = Parameters<typeof getAccount>[0];

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
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [base];

type WagmiConfigLike = Config & {
  connectors: Connector[];
};

export const wagmiAdapter = new WagmiAdapter({ networks, projectId, ssr: true });

export const appkitModal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: "Baseshire Hethaway",
    description: "Baseshire Hethaway",
    url: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
    icons: [],
  },
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
});

async function waitForConnectedAccount(config: WagmiConfigLike) {
  const deadline = Date.now() + 10_000;
  let account = getAccount(config as GetAccountConfig) as AccountLike;

  while (!account?.address && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    account = getAccount(config as GetAccountConfig) as AccountLike;
  }

  return account?.address ? account : null;
}

export async function connectReownAppKitWallet() {
  const config = (wagmiAdapter as unknown as { wagmiConfig?: WagmiConfigLike })
    .wagmiConfig;
  if (!config) return null;

  await appkitModal.open({ view: "Connect", namespace: "eip155" }).catch(
    () => null,
  );

  const accountAfter = await waitForConnectedAccount(config);
  if (!accountAfter?.address) return null;

  const connector = accountAfter.connector || config.connectors[0];
  const provider = await connector.getProvider();

  return {
    address: accountAfter.address,
    chainId: accountAfter.chainId,
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
      config as GetAccountConfig,
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
