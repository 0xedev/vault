/* eslint-disable @next/next/no-img-element */
"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/icons";
import { useWallet } from "@/components/WalletProvider";
import { getEscrowAddress, writeFundDeal, writeListDeal, waitForDealId, hashMetadata, parseContractError } from "@/lib/contract";
import { parseEther, type Address } from "viem";
import type { ClankerToken } from "@/lib/data";
import { fmtCompact } from "@/lib/utils";

function Stat({ lab, v }: { lab: string; v: string }) {
  return (
    <div className="col" style={{ gap: 1 }}>
      <span className="meta">{lab}</span>
      <span className="amt mono" style={{ fontSize: 14 }}>{v}</span>
    </div>
  );
}

export default function ClankerPage() {
  const router = useRouter();
  const { address, isConnected, isConnecting, role, connect } = useWallet();
  const isSignedIn = Boolean(address && role);
  const [tokens, setTokens] = useState<ClankerToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listing, setListing] = useState(false);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [chain, setChain] = useState("Base");
  const [totalSupply, setTotalSupply] = useState("");
  const [remainingSupply, setRemainingSupply] = useState("");
  const [vaultedAmount, setVaultedAmount] = useState("");
  const [vaultUnlock, setVaultUnlock] = useState("");
  const [feeEarnings, setFeeEarnings] = useState("");
  const [price, setPrice] = useState("");
  const [poolAddress, setPoolAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedToken, setSelectedToken] = useState<ClankerToken | null>(null);
  const [buying, setBuying] = useState("");
  const [ownedTokens, setOwnedTokens] = useState<ClankerToken[]>([]);
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [ownedLoaded, setOwnedLoaded] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [selectedListingToken, setSelectedListingToken] = useState<ClankerToken | null>(null);
  const [saleRights, setSaleRights] = useState<string[]>(["full_package"]);
  const [openAfterAuth, setOpenAfterAuth] = useState(false);

  useEffect(() => {
    fetch("/api/marketplace/clanker")
      .then(r => r.json())
      .then(json => { setTokens(json.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const resetListingForm = () => {
    setName(""); setSymbol(""); setContractAddress(""); setChain("Base");
    setTotalSupply(""); setRemainingSupply(""); setVaultedAmount("");
    setVaultUnlock(""); setFeeEarnings(""); setPrice("");
    setPoolAddress(""); setImageUrl(""); setDescription("");
    setSelectedListingToken(null);
    setSaleRights(["full_package"]);
    setManualEntry(false);
  };

  const applyClankerToken = React.useCallback((token: ClankerToken) => {
    setSelectedListingToken(token);
    setName(token.name);
    setSymbol(token.symbol);
    setContractAddress(token.tokenAddress);
    setChain(token.chain || "Base");
    setTotalSupply(String(token.totalSupply || ""));
    setRemainingSupply(String(token.remainingSupply || ""));
    setVaultedAmount(String(token.vaultedAmount || ""));
    setVaultUnlock(token.vaultUnlock || "");
    setFeeEarnings(String(token.feeEarnings || ""));
    setPoolAddress(token.poolAddress || "");
    setImageUrl(token.imageUrl || "");
    setDescription("");
    setError("");
  }, []);

  const loadOwnedTokens = React.useCallback(async () => {
    if (!isSignedIn || !address || ownedLoading || ownedLoaded) return;
    setOwnedLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clanker/owned");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to load your Clanker tokens");
      setOwnedTokens(json.data || []);
      setOwnedLoaded(true);
      if ((json.data || []).length === 1) applyClankerToken(json.data[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your Clanker tokens");
    } finally {
      setOwnedLoading(false);
    }
  }, [address, applyClankerToken, isSignedIn, ownedLoaded, ownedLoading]);

  useEffect(() => {
    if (!openAfterAuth || !isSignedIn) return;
    queueMicrotask(() => {
      setOpenAfterAuth(false);
      setListing(true);
      void loadOwnedTokens();
    });
  }, [isSignedIn, loadOwnedTokens, openAfterAuth]);

  useEffect(() => {
    if (!openAfterAuth || isConnecting || isSignedIn) return;
    const timeout = window.setTimeout(() => {
      setOpenAfterAuth(false);
      setError("Wallet connected, but sign-in did not complete. Try signing in again.");
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [isConnecting, isSignedIn, openAfterAuth]);

  const openListingModal = async () => {
    if (!isSignedIn) {
      setOpenAfterAuth(true);
      await connect();
      return;
    }
    setListing(true);
    void loadOwnedTokens();
  };

  const verifyManualToken = async () => {
    if (!contractAddress) return;
    setVerifyingToken(true);
    setError("");
    try {
      const res = await fetch(`/api/clanker/verify?contractAddress=${encodeURIComponent(contractAddress)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to verify token ownership");
      applyClankerToken(json.data);
    } catch (err) {
      setSelectedListingToken(null);
      setError(err instanceof Error ? err.message : "Unable to verify token ownership");
    } finally {
      setVerifyingToken(false);
    }
  };

  const vaultLocked = vaultUnlock ? new Date(vaultUnlock) > new Date() : false;

  const toggleSaleRight = (right: string) => {
    setSaleRights((current) => {
      if (right === "full_package") {
        if (vaultLocked) {
          const group = ["admin_rights", "fee_rights", "remaining_supply"];
          const hasAll = group.every((r) => current.includes(r));
          if (hasAll) return current.filter((r) => !group.includes(r));
          return group;
        }
        return current.includes("full_package") ? [] : ["full_package"];
      }
      const withoutFull = current.filter((item) => item !== "full_package");
      return withoutFull.includes(right)
        ? withoutFull.filter((item) => item !== right)
        : [...withoutFull, right];
    });
  };

  const submitListing = async () => {
    if (!address) {
      setError("Connect your wallet before listing a token.");
      return;
    }
    if (!role) {
      setError("Sign in with your wallet before listing a token.");
      return;
    }
    if (!selectedListingToken) {
      setError("Choose one of your Clanker tokens or verify a contract address first.");
      return;
    }
    if (!saleRights.length) {
      setError("Choose what rights are included in the sale.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const metadata = {
        name, symbol, contractAddress, chain, poolAddress,
        totalSupply: Number(totalSupply || 0),
        remainingSupply: Number(remainingSupply || 0),
        vaultedAmount: Number(vaultedAmount || 0),
        vaultUnlock, feeEarnings: Number(feeEarnings || 0),
        price: Number(price), image: imageUrl, description,
        saleRights,
        kind: "Clanker Token",
        createdAt: new Date().toISOString(),
      };
      const metaHash = hashMetadata(metadata);

      const txHash = await writeListDeal(address as Address, parseEther(price || "0"), metaHash);
      const contractListingId = await waitForDealId(txHash);

      const res = await fetch("/api/marketplace/clanker", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress: address,
          title: `${name} (${symbol})`,
          price: Number(price),
          description,
          chainId: chain === "Base" ? 8453 : 1,
          contractAddress: getEscrowAddress(),
          contractListingId,
          txHash,
          data: {
            name, symbol, tokenAddress: contractAddress, chain,
            totalSupply: Number(totalSupply || 0),
            remainingSupply: Number(remainingSupply || 0),
            vaultedAmount: Number(vaultedAmount || 0),
            vaultUnlock,
            feeEarnings: Number(feeEarnings || 0),
            poolAddress,
            imageUrl,
            saleRights,
            verified: true,
            metadataHash: metaHash,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to list token");
      resetListingForm();
      setListing(false);
      window.location.reload();
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const fundEscrow = async (token: ClankerToken) => {
    if (!isSignedIn || !address) {
      await connect();
      return;
    }
    setBuying(token.id);
    setError("");
    try {
      if (!token.sellerAddress) throw new Error("Listing seller is missing.");
      if (token.sellerAddress.toLowerCase() === address.toLowerCase()) throw new Error("You cannot buy your own listing.");
      if (!token.contractListingId) throw new Error("Listing is pending chain sync. Try again after the listing transaction is confirmed.");
      const txHash = await writeFundDeal(address as Address, BigInt(token.contractListingId), parseEther(String(token.price)));
      const res = await fetch("/api/escrows", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: token.id,
          sellerAddress: token.sellerAddress,
          amount: token.price,
          currency: "ETH",
          chainId: token.chainId || 8453,
          contractAddress: token.contractAddress || getEscrowAddress(),
          contractListingId: token.contractListingId,
          txHash,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to create escrow");
      router.push("/deals");
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setBuying("");
    }
  };

  const totalLocked = tokens.reduce((s, t) => s + (t.vaultedAmount || 0), 0);
  const totalFees = tokens.reduce((s, t) => s + (t.feeEarnings || 0), 0);

  if (loading) return <main id="main-content" role="main" aria-label="Main content" className="main"><div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading…</div></main>;

  return (
    <main id="main-content" role="main" aria-label="Main content" className="main">
      <div className="row between" style={{ marginBottom: 22 }}>
        <div>
          <div className="eyebrow">Clanker Tokens</div>
          <h1 className="h2" style={{ margin: "8px 0 0" }}>Deployer ownership marketplace</h1>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>Buy & sell Clanker-deployed token supply, vaulted allocations, and fee rights.</p>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="metric"><span className="lab">Listings</span><span className="val">{tokens.length}</span><span className="delta">{tokens.filter(t => t.verified).length} verified</span></div>
        <div className="metric"><span className="lab">Total vaulted</span><span className="val">{totalLocked.toLocaleString()}</span><span className="delta">tokens locked in vault</span></div>
        <div className="metric"><span className="lab">Accrued fees</span><span className="val">{totalFees.toLocaleString()}</span><span className="delta">claimable fees across all</span></div>
        <div className="metric"><span className="lab">Chain</span><span className="val">Base</span><span className="delta">Uniswap v4 + Clanker</span></div>
      </div>

      <div className="row between" style={{ marginBottom: 14 }}>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn primary" onClick={openListingModal} disabled={isConnecting}>
            {isSignedIn ? "List token" : isConnecting || openAfterAuth ? "Connecting..." : isConnected ? "Sign in to list" : "Connect to list"}
          </button>
        </div>
      </div>

      {error && <div className="warn-banner" style={{ marginBottom: 14, color: "var(--risk)" }}>{error}</div>}

      {tokens.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <span className="muted" style={{ fontSize: 30 }}>🏷️</span>
          <h3 className="serif" style={{ margin: "12px 0 4px", fontSize: 20 }}>No Clanker tokens listed</h3>
          <p className="muted" style={{ fontSize: 13 }}>Be the first to list a Clanker-deployed token.</p>
        </div>
      ) : (
        <div className="grid grid-3" style={{ gap: 16 }}>
          {tokens.map((t) => (
            <div key={t.id} className="card" style={{ padding: 16, cursor: "pointer" }} onClick={() => setSelectedToken(t)}>
              <div className="row" style={{ gap: 10, marginBottom: 10 }}>
                {t.imageUrl ? (
                  <img src={t.imageUrl} alt={t.name} style={{ width: 40, height: 40, borderRadius: 20, objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏷️</div>
                )}
                <div>
                  <div className="mono" style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-4)" }}>${t.symbol} · {t.chain}</div>
                </div>
              </div>
              <div className="grid grid-3" style={{ gap: 8, marginBottom: 10 }}>
                <Stat lab="Supply" v={fmtCompact(t.totalSupply)} />
                <Stat lab="Remaining" v={fmtCompact(t.remainingSupply)} />
                <Stat lab="Price" v={`${t.price} Ξ`} />
              </div>
              {t.vaultedAmount > 0 && (
                <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 4 }}>
                  🔒 {fmtCompact(t.vaultedAmount)} vaulted{t.vaultUnlock ? ` · Unlocks ${t.vaultUnlock}` : ""}
                </div>
              )}
              {t.feeEarnings > 0 && (
                <div style={{ fontSize: 11, color: "var(--accent)" }}>
                  💰 {t.feeEarnings.toLocaleString()} fees accrued
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedToken && (
        <div className="modal-bg" onClick={() => setSelectedToken(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-h">
              <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>{selectedToken.name} (${selectedToken.symbol})</h3>
              <button className="btn ghost sm" onClick={() => setSelectedToken(null)}><Icon.x /></button>
            </div>
            <div className="modal-b col" style={{ gap: 14, maxHeight: "70vh", overflowY: "auto" }}>
              <div className="grid grid-3" style={{ gap: 12 }}>
                <div className="metric"><span className="lab">Price</span><span className="val">{selectedToken.price} Ξ</span></div>
                <div className="metric"><span className="lab">Chain</span><span className="val" style={{ fontSize: 16 }}>{selectedToken.chain}</span></div>
                <div className="metric"><span className="lab">Symbol</span><span className="val" style={{ fontSize: 16 }}>${selectedToken.symbol}</span></div>
              </div>
              <hr className="hr" />
              <div className="grid grid-3" style={{ gap: 12 }}>
                <div className="metric"><span className="lab">Total supply</span><span className="val">{fmtCompact(selectedToken.totalSupply)}</span></div>
                <div className="metric"><span className="lab">Remaining</span><span className="val">{fmtCompact(selectedToken.remainingSupply)}</span></div>
                <div className="metric"><span className="lab">Vaulted</span><span className="val">{fmtCompact(selectedToken.vaultedAmount)}</span></div>
              </div>
              {selectedToken.vaultUnlock && (
                <div className="metric"><span className="lab">Vault unlock</span><span className="val">{selectedToken.vaultUnlock}</span></div>
              )}
              <div className="grid grid-3" style={{ gap: 12 }}>
                <div className="metric"><span className="lab">Fee earnings</span><span className="val">{selectedToken.feeEarnings.toLocaleString()}</span><span className="delta">via ClankerFeeLocker</span></div>
                <div className="metric"><span className="lab">Contract</span><span className="val mono" style={{ fontSize: 12 }}>{selectedToken.tokenAddress.slice(0, 10)}…</span><span className="delta">verified token</span></div>
                <div className="metric"><span className="lab">Pool</span><span className="val mono" style={{ fontSize: 12 }}>{selectedToken.poolAddress ? selectedToken.poolAddress.slice(0, 10) + "…" : "—"}</span><span className="delta">Uniswap v4</span></div>
              </div>
            </div>
            <div className="modal-f">
              <button className="btn" onClick={() => setSelectedToken(null)}>Close</button>
              <button className="btn primary" onClick={() => fundEscrow(selectedToken)} disabled={buying === selectedToken.id || selectedToken.sellerAddress?.toLowerCase() === address?.toLowerCase()}>
                {buying === selectedToken.id ? "Funding escrow..." : selectedToken.sellerAddress?.toLowerCase() === address?.toLowerCase() ? "Your listing" : "Buy with escrow"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List modal */}
      {listing && (
        <div className="modal-bg" onClick={() => setListing(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-h">
              <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>List Clanker token</h3>
              <button className="btn ghost sm" onClick={() => setListing(false)}><Icon.x /></button>
            </div>
            <div className="modal-b col" style={{ gap: 14, maxHeight: "70vh", overflowY: "auto" }}>
              <div className="col" style={{ gap: 8 }}>
                <span className="label">Your Clanker tokens</span>
                {ownedLoading ? (
                  <div className="muted" style={{ padding: 18, textAlign: "center" }}>Loading your deployed tokens...</div>
                ) : ownedTokens.length > 0 ? (
                  <div className="grid grid-2" style={{ gap: 10 }}>
                    {ownedTokens.map((token) => {
                      const active = selectedListingToken?.tokenAddress?.toLowerCase() === token.tokenAddress.toLowerCase();
                      return (
                        <button
                          key={token.tokenAddress}
                          type="button"
                          className={`card ${active ? "gold" : ""}`}
                          onClick={() => applyClankerToken(token)}
                          style={{ padding: 12, textAlign: "left", borderColor: active ? "var(--accent)" : undefined }}
                        >
                          <div className="row" style={{ gap: 10 }}>
                            {token.imageUrl ? (
                              <img src={token.imageUrl} alt="" style={{ width: 34, height: 34, borderRadius: 17, objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: 34, height: 34, borderRadius: 17, background: "var(--surface-2)" }} />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div className="mono" style={{ color: "var(--ink)", fontSize: 13, fontWeight: 600 }}>{token.name}</div>
                              <div className="muted-2" style={{ fontSize: 11 }}>${token.symbol} · {token.tokenAddress.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="muted" style={{ padding: 18, textAlign: "center" }}>
                    No Clanker tokens were found for this wallet.
                  </div>
                )}
                <button className="btn ghost sm" type="button" onClick={() => setManualEntry((value) => !value)}>
                  {manualEntry ? "Hide contract input" : "I do not see my token"}
                </button>
              </div>

              {manualEntry && (
                <div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <span className="label">Token contract address</span>
                    <input className="input mono" value={contractAddress} onChange={e => { setContractAddress(e.target.value); setSelectedListingToken(null); }} placeholder="0x…" />
                  </div>
                  <button className="btn" type="button" disabled={verifyingToken || !contractAddress} onClick={verifyManualToken}>
                    {verifyingToken ? "Verifying..." : "Verify"}
                  </button>
                </div>
              )}

              {selectedListingToken && (
                <div className="card" style={{ padding: 14 }}>
                  <div className="row between" style={{ gap: 12 }}>
                    <div className="row" style={{ gap: 10 }}>
                      {imageUrl ? <img src={imageUrl} alt="" style={{ width: 42, height: 42, borderRadius: 21, objectFit: "cover" }} /> : null}
                      <div>
                        <div className="mono" style={{ color: "var(--ink)", fontWeight: 700 }}>{name} {symbol ? `($${symbol})` : ""}</div>
                        <div className="muted-2" style={{ fontSize: 11 }}>{contractAddress}</div>
                      </div>
                    </div>
                    <span className="pill gold"><span className="pdot" />Verified owner</span>
                  </div>
                  <div className="grid grid-3" style={{ gap: 10, marginTop: 12 }}>
                    <Stat lab="Supply" v={fmtCompact(Number(totalSupply || 0))} />
                    <Stat lab="Vaulted" v={fmtCompact(Number(vaultedAmount || 0))} />
                    <Stat lab="Fees" v={fmtCompact(Number(feeEarnings || 0))} />
                  </div>
                </div>
              )}

              <div>
                <span className="label">Rights included</span>
                <div className="grid grid-2" style={{ gap: 8 }}>
                  {[
                    ["full_package", "Full package"],
                    ["admin_rights", "Admin/deployer rights"],
                    ["fee_rights", "Creator fee rights"],
                    ...(vaultLocked ? [] : [["vaulted_tokens", "Vaulted tokens"]] as [string, string][]),
                    ["remaining_supply", "Remaining supply"],
                  ].map(([key, label]) => (
                    <label key={key} className="row" style={{ gap: 8, border: "1px solid var(--line)", borderRadius: 8, padding: "9px 10px" }}>
                      <input type="checkbox" checked={saleRights.includes(key)} onChange={() => toggleSaleRight(key)} />
                      <span style={{ fontSize: 13 }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 12 }}>
                <div><span className="label">Price (Ξ)</span><input className="input mono" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></div>
                <div><span className="label">Chain</span><input className="input" value={chain} readOnly /></div>
              </div>
              <div><span className="label">Sale notes</span><textarea className="input" style={{ minHeight: 60 }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional terms, transfer steps, or what is included." /></div>
              {error && <div className="warn-banner" style={{ color: "var(--risk)" }}>{error}</div>}
            </div>
            <div className="modal-f">
              <button className="btn" onClick={() => { setListing(false); setError(""); resetListingForm(); }}>Close</button>
              <button className="btn primary" disabled={submitting || !selectedListingToken || !price || saleRights.length === 0} onClick={submitListing}>
                {submitting ? "Signing & listing…" : "Submit for review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
