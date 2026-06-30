/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/icons";
import SubmitDealOfferModal from "@/components/SubmitDealOfferModal";
import ListingMessageModal from "@/components/ListingMessageModal";
import BackButton from "@/components/BackButton";
import ListClankerModal from "@/components/ListClankerModal";
import { useWallet } from "@/components/WalletProvider";
import { getEscrowAddress, getPublicClient, getDealsAddress, writeFundDeal, parseContractError, writeApproveUsdc } from "@/lib/contract";
import { parseUnits, type Address } from "viem";
import type { ClankerToken } from "@/lib/data";
import { fmtCompact, fmtUSDC } from "@/lib/utils";

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
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const { address, isConnected, isConnecting, role, connect } = useWallet();
  const isSignedIn = Boolean(address && role);
  const [tokens, setTokens] = useState<ClankerToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listing, setListing] = useState(false);
  const [selectedToken, setSelectedToken] = useState<ClankerToken | null>(null);
  const [offerToken, setOfferToken] = useState<ClankerToken | null>(null);
  const [messageToken, setMessageToken] = useState<ClankerToken | null>(null);
  const [buying, setBuying] = useState("");
  const [openAfterAuth, setOpenAfterAuth] = useState(false);

  useEffect(() => {
    fetch("/api/marketplace/clanker")
      .then(r => r.json())
      .then(json => { setTokens(json.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId || tokens.length === 0) return;
    const token = tokens.find((item) => item.id === selectedId);
    if (token) queueMicrotask(() => setSelectedToken(token));
  }, [selectedId, tokens]);

  useEffect(() => {
    if (!openAfterAuth || !isSignedIn) return;
    queueMicrotask(() => {
      setOpenAfterAuth(false);
      setListing(true);
    });
  }, [isSignedIn, openAfterAuth]);

  useEffect(() => {
    if (!openAfterAuth || isConnecting || isSignedIn) return;
    const timeout = window.setTimeout(() => {
      setOpenAfterAuth(false);
      if (isConnected && !role) {
        setError("SIWF sign-in did not complete. Check the Farcaster SDK is loaded and try again.");
      } else if (!isConnected) {
        setError("Wallet connection failed. Make sure your wallet is unlocked.");
      } else {
        setError("Wallet connected, but sign-in did not complete. Try signing in again.");
      }
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [isConnecting, isSignedIn, openAfterAuth, isConnected, role]);

  const openListingModal = async () => {
    if (!isSignedIn) {
      setOpenAfterAuth(true);
      await connect();
      return;
    }
    setListing(true);
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
      const amtWei = parseUnits(String(token.price), 6);
      const approveHash = await writeApproveUsdc(address as Address, await getDealsAddress(), amtWei);
      await getPublicClient().waitForTransactionReceipt({ hash: approveHash });
      const txHash = await writeFundDeal(address as Address, BigInt(token.contractListingId), amtWei);
      const res = await fetch("/api/escrows", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: token.id,
          buyerAddress: address,
          sellerAddress: token.sellerAddress,
          amount: token.price,
          currency: "USDC",
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

  const messageSeller = async (token: ClankerToken) => {
    if (!isSignedIn || !address) {
      await connect();
      return;
    }
    setMessageToken(token);
  };

  const totalLocked = tokens.reduce((s, t) => s + (t.vaultedAmount || 0), 0);
  const totalFees = tokens.reduce((s, t) => s + (t.feeEarnings || 0), 0);

  if (loading) return <main id="main-content" role="main" aria-label="Main content" className="main"><div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading…</div></main>;

  return (
    <main id="main-content" role="main" aria-label="Main content" className="main">
      <BackButton />
      <div className="row between" style={{ marginBottom: 22, gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div className="eyebrow">Clanker Tokens</div>
          <h1 className="h2" style={{ margin: "8px 0 0" }}>Deployer ownership marketplace</h1>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>Buy & sell Clanker-deployed token supply, vaulted allocations, and fee rights.</p>
        </div>
        <div className="market-inline-stats">
          <span><strong>{tokens.length}</strong> listings</span>
          <span><strong>{tokens.filter(t => t.verified).length}</strong> verified</span>
          <span><strong>{fmtCompact(totalLocked)}</strong> vaulted</span>
          <span><strong>{fmtCompact(totalFees)}</strong> fees</span>
        </div>
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
          {tokens.map((t) => {
            const isOwnListing = t.sellerAddress?.toLowerCase() === address?.toLowerCase();
            const isPendingSync = !t.contractListingId;
            return (
            <div key={t.id} className="card market-action-card" style={{ padding: 16, ...(t.id === selectedId ? { borderColor: "var(--accent)" } : {}) }}>
              <button className="ghost-hit-area" type="button" onClick={() => setSelectedToken(t)} aria-label={`View ${t.name}`} />
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
                <Stat lab="Price" v={`${fmtUSDC(t.price)} USDC`} />
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
              <div className="market-card-actions" style={{ marginTop: 12, position: "relative", zIndex: 1 }}>
                <button className="btn primary" onClick={() => fundEscrow(t)} disabled={buying === t.id || isOwnListing || isPendingSync}>
                  {buying === t.id ? "Funding..." : isOwnListing ? "Your listing" : isPendingSync ? "Pending sync" : "Buy now"}
                </button>
                <button className="btn" onClick={() => setOfferToken(t)} disabled={isOwnListing || isPendingSync}>
                  Propose offer
                </button>
                <button className="btn ghost" onClick={() => messageSeller(t)} disabled={isOwnListing}>
                  Msg seller
                </button>
              </div>
            </div>
            );
          })}
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
                <div className="metric"><span className="lab">Price</span><span className="val">{fmtUSDC(selectedToken.price)} USDC</span></div>
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
                <div className="metric"><span className="lab">Contract</span><span className="val mono" style={{ fontSize: 12 }}>{selectedToken.tokenAddress.slice(0, 10)}…</span><span className="delta">ownership confirmed</span></div>
                <div className="metric"><span className="lab">Pool</span><span className="val mono" style={{ fontSize: 12 }}>{selectedToken.poolAddress ? selectedToken.poolAddress.slice(0, 10) + "…" : "—"}</span><span className="delta">Uniswap v4</span></div>
              </div>
            </div>
            <div className="modal-f">
              <button className="btn" onClick={() => setSelectedToken(null)}>Close</button>
              <button
                className="btn"
                onClick={() => setOfferToken(selectedToken)}
                disabled={!selectedToken.contractListingId || selectedToken.sellerAddress?.toLowerCase() === address?.toLowerCase()}
              >
                Submit offer
              </button>
              <button className="btn primary" onClick={() => fundEscrow(selectedToken)} disabled={buying === selectedToken.id || selectedToken.sellerAddress?.toLowerCase() === address?.toLowerCase()}>
                {buying === selectedToken.id ? "Funding escrow..." : selectedToken.sellerAddress?.toLowerCase() === address?.toLowerCase() ? "Your listing" : "Buy with escrow"}
              </button>
            </div>
          </div>
        </div>
      )}

      {offerToken && (
        <SubmitDealOfferModal
          listing={{
            id: offerToken.id,
            title: `${offerToken.name} (${offerToken.symbol})`,
            price: offerToken.price,
            sellerAddress: offerToken.sellerAddress,
            contractListingId: offerToken.contractListingId,
            contractAddress: offerToken.contractAddress,
            chainId: offerToken.chainId,
          }}
          onClose={() => setOfferToken(null)}
        />
      )}
      {messageToken && (
        <ListingMessageModal
          listing={{
            id: messageToken.id,
            title: `${messageToken.name} (${messageToken.symbol})`,
            sellerAddress: messageToken.sellerAddress,
          }}
          onClose={() => setMessageToken(null)}
        />
      )}

      {/* List modal — now uses shared ListClankerModal component */}
      {listing && (
        <ListClankerModal
          onClose={() => { setListing(false); }}
          onListed={() => {
            window.location.reload();
          }}
        />
      )}
    </main>
  );
}
