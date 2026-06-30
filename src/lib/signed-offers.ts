import { parseUnits, type Address, type TypedDataDomain } from "viem";

export type SignedOfferKind = "nft_loan" | "deal";

export type SignedLoanOfferMessage = {
  listingId: bigint;
  lender: Address;
  amount: bigint;
  apr: bigint;
  term: bigint;
  expiry: bigint;
  nonce: bigint;
};

export type SignedDealOfferMessage = {
  dealId: bigint;
  buyer: Address;
  amount: bigint;
  expiry: bigint;
  nonce: bigint;
};

export const signedLoanOfferTypes = {
  SignedLoanOffer: [
    { name: "listingId", type: "uint256" },
    { name: "lender", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "apr", type: "uint256" },
    { name: "term", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export const signedDealOfferTypes = {
  SignedDealOffer: [
    { name: "dealId", type: "uint256" },
    { name: "buyer", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export function offerNonce() {
  const now = BigInt(Date.now());
  const random = BigInt(Math.floor(Math.random() * 1_000_000_000));
  return (now << BigInt(32)) + random;
}

export function expiryFromHours(hours = 24) {
  return BigInt(Math.floor(Date.now() / 1000) + hours * 60 * 60);
}

export function usdcAmount(amount: number | string) {
  return parseUnits(String(amount || "0"), 6);
}

export function aprBps(apr?: number | string | null) {
  return BigInt(Math.round(Number(apr || 0) * 100));
}

export function typedDataDomain(name: "VaultNFT" | "VaultDeals", verifyingContract: Address, chainId = 8453): TypedDataDomain {
  return {
    name,
    version: "1",
    chainId,
    verifyingContract,
  };
}

export function buildSignedLoanOfferTypedData(args: {
  verifyingContract: Address;
  chainId?: number;
  listingId: string | number | bigint;
  lender: Address;
  amount: number | string;
  apr: number | string;
  termDays: number | string;
  expiry: bigint;
  nonce: bigint;
}) {
  return {
    domain: typedDataDomain("VaultNFT", args.verifyingContract, args.chainId),
    types: signedLoanOfferTypes,
    primaryType: "SignedLoanOffer" as const,
    message: {
      listingId: BigInt(args.listingId),
      lender: args.lender,
      amount: usdcAmount(args.amount),
      apr: aprBps(args.apr),
      term: BigInt(args.termDays),
      expiry: args.expiry,
      nonce: args.nonce,
    },
  };
}

export function buildSignedDealOfferTypedData(args: {
  verifyingContract: Address;
  chainId?: number;
  dealId: string | number | bigint;
  buyer: Address;
  amount: number | string;
  expiry: bigint;
  nonce: bigint;
}) {
  return {
    domain: typedDataDomain("VaultDeals", args.verifyingContract, args.chainId),
    types: signedDealOfferTypes,
    primaryType: "SignedDealOffer" as const,
    message: {
      dealId: BigInt(args.dealId),
      buyer: args.buyer,
      amount: usdcAmount(args.amount),
      expiry: args.expiry,
      nonce: args.nonce,
    },
  };
}
