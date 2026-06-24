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
  const { address, isConnected, connect } = useWallet();
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

  useEffect(() => {
    fetch("/api/marketplace/clanker")
      .then(r => r.json())
      .then(json => { setTokens(json.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const submitListing = async () => {
    if (!address) return;
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
        kind: "Clanker Token",
        createdAt: new Date().toISOString(),
      };
      const metaHash = hashMetadata(metadata);

      const txHash = await writeListDeal(address as Address, parseEther(price || "0"), metaHash);
      const contractListingId = await waitForDealId(txHash);

      const res = await fetch("/api/marketplace/clanker", {
        method: "POST",
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
            verified: false,
            metadataHash: metaHash,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to list token");
      setName(""); setSymbol(""); setContractAddress(""); setChain("Base");
      setTotalSupply(""); setRemainingSupply(""); setVaultedAmount("");
      setVaultUnlock(""); setFeeEarnings(""); setPrice("");
      setPoolAddress(""); setImageUrl(""); setDescription("");
      setListing(false);
      window.location.reload();
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const fundEscrow = async (token: ClankerToken) => {
    if (!isConnected || !address) {
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
          <button className="btn primary" onClick={() => isConnected ? setListing(true) : connect()}>
            {isConnected ? "List token" : "Connect to list"}
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-h">
              <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>List Clanker token</h3>
              <button className="btn ghost sm" onClick={() => setListing(false)}><Icon.x /></button>
            </div>
            <div className="modal-b col" style={{ gap: 14, maxHeight: "70vh", overflowY: "auto" }}>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div><span className="label">Token name</span><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="My Token" /></div>
                <div><span className="label">Symbol</span><input className="input" value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="TKN" /></div>
              </div>
              <div><span className="label">Contract address</span><input className="input mono" value={contractAddress} onChange={e => setContractAddress(e.target.value)} placeholder="0x…" /></div>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div><span className="label">Chain</span><select className="input" value={chain} onChange={e => setChain(e.target.value)}><option>Base</option><option>Ethereum</option><option>Optimism</option><option>Arbitrum</option></select></div>
                <div><span className="label">Price (Ξ)</span><input className="input mono" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></div>
              </div>
              <div className="grid grid-3" style={{ gap: 12 }}>
                <div><span className="label">Total supply</span><input className="input mono" type="number" value={totalSupply} onChange={e => setTotalSupply(e.target.value)} /></div>
                <div><span className="label">Remaining supply</span><input className="input mono" type="number" value={remainingSupply} onChange={e => setRemainingSupply(e.target.value)} /></div>
                <div><span className="label">Vaulted amount</span><input className="input mono" type="number" value={vaultedAmount} onChange={e => setVaultedAmount(e.target.value)} /></div>
              </div>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div><span className="label">Vault unlock (date)</span><input className="input" value={vaultUnlock} onChange={e => setVaultUnlock(e.target.value)} placeholder="2025-01-01" /></div>
                <div><span className="label">Fee earnings</span><input className="input mono" type="number" value={feeEarnings} onChange={e => setFeeEarnings(e.target.value)} placeholder="0" /></div>
              </div>
              <div><span className="label">Pool address</span><input className="input mono" value={poolAddress} onChange={e => setPoolAddress(e.target.value)} placeholder="0x…" /></div>
              <div><span className="label">Image URL</span><input className="input" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…" /></div>
              <div><span className="label">Description</span><textarea className="input" style={{ minHeight: 60 }} value={description} onChange={e => setDescription(e.target.value)} placeholder="What's included in the sale?" /></div>
              {error && <div className="warn-banner" style={{ color: "var(--risk)" }}>{error}</div>}
            </div>
            <div className="modal-f">
              <button className="btn" onClick={() => { setListing(false); setError(""); }}>Close</button>
              <button className="btn primary" disabled={submitting || !name || !symbol || !price} onClick={submitListing}>
                {submitting ? "Signing & listing…" : "Submit for review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
