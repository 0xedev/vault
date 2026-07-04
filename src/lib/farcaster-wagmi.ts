"use client";

import {
  connect,
  createConfig,
  disconnect,
  getAccount,
  http,
  reconnect,
} from "@wagmi/core";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import {
  arbitrum,
  base,
  baseSepolia,
  bsc,
  mainnet,
  optimism,
} from "viem/chains";

type WalletProviderLike = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
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

function isAlreadyConnectedError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    (
      (err as { name?: string }).name === "ConnectorAlreadyConnectedError" ||
      String((err as { message?: string }).message || "")
        .toLowerCase()
        .includes("already connected")
    )
  );
}

async function walletFromCurrentAccount() {
  const account = getAccount(farcasterWagmiConfig);
  const connector = account.connector || farcasterWagmiConfig.connectors[0];
  const provider = await connector.getProvider();

  if (!account.address) return null;
  return {
    address: account.address,
    chainId: account.chainId,
    provider: provider as WalletProviderLike,
  };
}

export async function connectFarcasterMiniAppWallet() {
  try {
    const connected = await connect(farcasterWagmiConfig, {
      connector: farcasterWagmiConfig.connectors[0],
    });
    const accountAfterConnect = getAccount(farcasterWagmiConfig);
    const connector =
      accountAfterConnect.connector || farcasterWagmiConfig.connectors[0];
    const provider = await connector.getProvider();

    return {
      address: connected.accounts[0] || accountAfterConnect.address,
      chainId: connected.chainId || accountAfterConnect.chainId,
      provider: provider as WalletProviderLike,
    };
  } catch (err) {
    if (isAlreadyConnectedError(err)) {
      const current = await walletFromCurrentAccount();
      if (current) return current;
    }
    throw err;
  }
}

export async function getFarcasterMiniAppWalletProvider() {
  const provider = await farcasterWagmiConfig.connectors[0].getProvider();
  return provider as WalletProviderLike;
}

export async function reconnectFarcasterMiniAppWallet() {
  const current = await walletFromCurrentAccount();
  if (current) return current;

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
