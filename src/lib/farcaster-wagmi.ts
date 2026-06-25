"use client";

import { connect, createConfig, disconnect, getAccount, http, reconnect } from "@wagmi/core";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { arbitrum, base, baseSepolia, bsc, mainnet, optimism } from "viem/chains";

type WalletProviderLike = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

const miniAppConnector = farcasterMiniApp();

export const farcasterWagmiConfig = createConfig({
  chains: [base, mainnet, optimism, arbitrum, bsc, baseSepolia],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [bsc.id]: http(),
    [baseSepolia.id]: http(),
  },
  connectors: [miniAppConnector],
  ssr: true,
});

export async function connectFarcasterMiniAppWallet() {
  const account = getAccount(farcasterWagmiConfig);
  if (account.isConnected && account.address && account.chainId && account.connector) {
    const provider = await account.connector.getProvider();
    return {
      address: account.address,
      chainId: account.chainId,
      provider: provider as WalletProviderLike,
    };
  }

  const connected = await connect(farcasterWagmiConfig, {
    connector: farcasterWagmiConfig.connectors[0],
  });
  const accountAfterConnect = getAccount(farcasterWagmiConfig);
  const connector = accountAfterConnect.connector || farcasterWagmiConfig.connectors[0];
  const provider = await connector.getProvider();

  return {
    address: connected.accounts[0],
    chainId: connected.chainId,
    provider: provider as WalletProviderLike,
  };
}

export async function reconnectFarcasterMiniAppWallet() {
  const connections = await reconnect(farcasterWagmiConfig, {
    connectors: [farcasterWagmiConfig.connectors[0]],
  }).catch(() => []);
  const connection = connections[0];
  if (!connection?.accounts[0]) return null;

  const provider = await connection.connector.getProvider();
  return {
    address: connection.accounts[0],
    chainId: connection.chainId,
    provider: provider as WalletProviderLike,
  };
}

export async function disconnectFarcasterMiniAppWallet() {
  await disconnect(farcasterWagmiConfig).catch(() => {});
}
