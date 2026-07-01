type WalletIdentity = {
  address?: string | null;
  sessionAddress?: string | null;
};

export function normalizeEvmAddress(address: unknown) {
  return typeof address === "string" && /^0x[a-fA-F0-9]{40}$/.test(address)
    ? address.toLowerCase()
    : "";
}

export function currentActorAddress(identity: WalletIdentity) {
  const session = normalizeEvmAddress(identity.sessionAddress);
  if (session) return session;
  return normalizeEvmAddress(identity.address);
}

export function isOwnListing(
  listing: { sellerAddress?: string | null },
  identity: WalletIdentity,
) {
  const seller = normalizeEvmAddress(listing.sellerAddress);
  const actor = currentActorAddress(identity);
  return Boolean(seller && actor && seller === actor);
}
