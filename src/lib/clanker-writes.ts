"use client";

import { Clanker } from "clanker-sdk/v4";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  type Address,
  type Chain,
  type Hash,
} from "viem";
import { arbitrum, base, baseSepolia, bsc, mainnet, optimism } from "viem/chains";

const ERC20_ABI = [
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

const TOKEN_ADMIN_ABI = [
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setAdmin",
    inputs: [{ name: "newAdmin", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

function chainForId(chainId?: number): Chain {
  const chains: Record<number, Chain> = {
    1: mainnet,
    10: optimism,
    56: bsc,
    42161: arbitrum,
    8453: base,
    84532: baseSepolia,
  };
  return chains[chainId || 8453] || base;
}

function requireWallet() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet available");
  }
  return window.ethereum;
}

function publicClientFor(chain: Chain) {
  return createPublicClient({
    chain,
    transport: http(),
  });
}

function walletClientFor(account: Address, chain: Chain) {
  return createWalletClient({
    account,
    chain,
    transport: custom(requireWallet() as never),
  });
}

function clankerFor(account: Address, chain: Chain) {
  return new Clanker({
    wallet: walletClientFor(account, chain),
    publicClient: publicClientFor(chain),
  });
}

function sameAddress(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

async function waitForHashes(chain: Chain, hashes: Hash[]) {
  const publicClient = publicClientFor(chain);
  for (const hash of hashes) {
    await publicClient.waitForTransactionReceipt({ hash });
  }
  return hashes;
}

export async function transferClankerRewardRecipients(params: {
  account: Address;
  token: Address;
  buyer: Address;
  chainId?: number;
}): Promise<Hash[]> {
  const chain = chainForId(params.chainId);
  const clanker = clankerFor(params.account, chain);
  const rewards = await clanker.getTokenRewards({ token: params.token });
  const indexes = rewards.rewardRecipients
    .map((recipient, index) => ({ recipient, index }))
    .filter((item) => sameAddress(item.recipient, params.account));

  if (indexes.length === 0) {
    throw new Error("No reward recipient slots are controlled by the connected seller wallet.");
  }

  const hashes: Hash[] = [];
  for (const item of indexes) {
    const result = await clanker.updateRewardRecipient({
      token: params.token,
      rewardIndex: BigInt(item.index),
      newRecipient: params.buyer,
    });
    if (result.error || !result.txHash) {
      const msg = String(result.error || "Reward recipient transfer failed.");
      throw new Error(msg);
    }
    hashes.push(result.txHash);
  }
  return waitForHashes(chain, hashes);
}

export async function transferClankerRewardAdmins(params: {
  account: Address;
  token: Address;
  buyer: Address;
  chainId?: number;
}): Promise<Hash[]> {
  const chain = chainForId(params.chainId);
  const clanker = clankerFor(params.account, chain);
  const rewards = await clanker.getTokenRewards({ token: params.token });
  const indexes = rewards.rewardAdmins
    .map((admin, index) => ({ admin, index }))
    .filter((item) => sameAddress(item.admin, params.account));

  if (indexes.length === 0) {
    throw new Error("No reward admin slots are controlled by the connected seller wallet.");
  }

  const hashes: Hash[] = [];
  for (const item of indexes) {
    const result = await clanker.updateRewardAdmin({
      token: params.token,
      rewardIndex: BigInt(item.index),
      newAdmin: params.buyer,
    });
    if (result.error || !result.txHash) {
      const msg = String(result.error || "Reward admin transfer failed.");
      throw new Error(msg);
    }
    hashes.push(result.txHash);
  }
  return waitForHashes(chain, hashes);
}

export async function transferClankerTokenAdmin(params: {
  account: Address;
  token: Address;
  buyer: Address;
  chainId?: number;
}): Promise<Hash[]> {
  const chain = chainForId(params.chainId);
  const publicClient = publicClientFor(chain);
  const wallet = walletClientFor(params.account, chain);

  try {
    await publicClient.simulateContract({
      account: params.account,
      address: params.token,
      abi: TOKEN_ADMIN_ABI,
      functionName: "transferOwnership",
      args: [params.buyer],
    });
    const hash = await wallet.writeContract({
      address: params.token,
      abi: TOKEN_ADMIN_ABI,
      functionName: "transferOwnership",
      args: [params.buyer],
    });
    return waitForHashes(chain, [hash]);
  } catch {
    // Some Clanker token versions expose setAdmin instead of Ownable transferOwnership.
  }

  try {
    await publicClient.simulateContract({
      account: params.account,
      address: params.token,
      abi: TOKEN_ADMIN_ABI,
      functionName: "setAdmin",
      args: [params.buyer],
    });
    const hash = await wallet.writeContract({
      address: params.token,
      abi: TOKEN_ADMIN_ABI,
      functionName: "setAdmin",
      args: [params.buyer],
    });
    return waitForHashes(chain, [hash]);
  } catch {
    throw new Error("This token does not expose a transferable admin or ownership method for the connected seller wallet.");
  }
}

export async function claimClankerVaultedTokens(params: {
  account: Address;
  token: Address;
  chainId?: number;
}): Promise<Hash[]> {
  const chain = chainForId(params.chainId);
  const clanker = clankerFor(params.account, chain);
  const result = await clanker.claimVaultedTokens({ token: params.token });
    if (result.error || !result.txHash) {
      const msg = String(result.error || "Vaulted token claim failed.");
      throw new Error(msg);
    }
  return waitForHashes(chain, [result.txHash]);
}

export async function transferClankerTokenSupply(params: {
  account: Address;
  token: Address;
  buyer: Address;
  amount: number;
  chainId?: number;
}): Promise<Hash[]> {
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error("No token amount is available for this transfer.");
  }
  const chain = chainForId(params.chainId);
  const publicClient = publicClientFor(chain);
  const wallet = walletClientFor(params.account, chain);
  const decimals = await publicClient.readContract({
    address: params.token,
    abi: ERC20_ABI,
    functionName: "decimals",
  });
  const hash = await wallet.writeContract({
    address: params.token,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [params.buyer, parseUnits(String(params.amount), decimals)],
  });
  return waitForHashes(chain, [hash]);
}
