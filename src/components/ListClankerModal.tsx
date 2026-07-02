/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useCallback, useEffect } from "react";
import Icon from "@/components/icons";
import { ListingSuccessModal, type ListingSuccessShare } from "@/components/ListingSuccessModal";
import { useWallet } from "@/components/WalletProvider";
import {
  getEscrowAddress,
  writeListDeal,
  waitForDealId,
  hashMetadata,
  parseContractError,
} from "@/lib/contract";
import { parseUnits, type Address } from "viem";
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

interface Props {
  onClose: () => void;
  onListed: () => void;
}

export default function ListClankerModal({ onClose, onListed }: Props) {
  const { address, role } = useWallet();
  const isSignedIn = Boolean(address && role);

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
  const [error, setError] = useState("");
  const [ownedTokens, setOwnedTokens] = useState<ClankerToken[]>([]);
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [ownedLoaded, setOwnedLoaded] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [checkingOwnership, setCheckingOwnership] = useState(false);
  const [selectedListingToken, setSelectedListingToken] = useState<ClankerToken | null>(null);
  const [saleRights, setSaleRights] = useState<string[]>(["full_package"]);
  const [success, setSuccess] = useState<ListingSuccessShare | null>(null);

  const vaultLocked = vaultUnlock ? new Date(vaultUnlock) > new Date() : false;

  const applyClankerToken = useCallback((token: ClankerToken) => {
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

  const loadOwnedTokens = useCallback(async () => {
    if (!isSignedIn || !address || ownedLoading || ownedLoaded) return;
    setOwnedLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/clanker/owned?wallet=${encodeURIComponent(address!)}`);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOwnedTokens();
  }, [loadOwnedTokens]);

  const checkManualTokenOwnership = async () => {
    if (!contractAddress) return;
    setCheckingOwnership(true);
    setError("");
    try {
      const res = await fetch(`/api/clanker/ownership?contractAddress=${encodeURIComponent(contractAddress)}&wallet=${encodeURIComponent(address || "")}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to confirm token ownership");
      applyClankerToken(json.data);
    } catch (err) {
      setSelectedListingToken(null);
      setError(err instanceof Error ? err.message : "Unable to confirm token ownership");
    } finally {
      setCheckingOwnership(false);
    }
  };

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

  const handleSubmit = async () => {
    if (!address) { setError("Connect your wallet before listing a token."); return; }
    if (!role) { setError("Sign in with your wallet before listing a token."); return; }
    if (!contractAddress || !contractAddress.startsWith("0x") || contractAddress.length !== 42) {
      setError("Enter a valid Clanker token contract address before listing.");
      return;
    }
    if (!saleRights.length) { setError("Choose what rights are included in the sale."); return; }
    setSubmitting(true);
    setError("");
    try {
      const metadata = {
        name, symbol, contractAddress, chain, poolAddress,
        totalSupply: Number(totalSupply || 0),
        remainingSupply: Number(remainingSupply || 0),
        vaultedAmount: Number(vaultedAmount || 0),
        vaultUnlock, feeEarnings: Number(feeEarnings || 0),
        price: Number(price), image: imageUrl, description, saleRights,
        kind: "Clanker Token", createdAt: new Date().toISOString(),
      };
      const metaHash = hashMetadata(metadata);
      const txHash = await writeListDeal(address as Address, parseUnits(price || "0", 6), metaHash, "clanker");
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
            poolAddress, imageUrl, saleRights,
            verified: true,
            metadataHash: metaHash,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to list token");
      const listingId = String(json.data?.id || contractListingId || Date.now());
      onListed();
      setSuccess({
        title: `${name} (${symbol})`,
        text: `${name} (${symbol}) — ${Number(price).toLocaleString("en-US")} USDC Clanker token listing on Vault`,
        url: `${window.location.origin}/clanker?id=${encodeURIComponent(listingId)}`,
      });
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return <ListingSuccessModal share={success} onClose={onClose} />;
  }

  if (!isSignedIn) {
    return (
      <div className="modal-bg" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
          <div className="modal-h">
            <div>
              <div className="eyebrow">List Clanker Token</div>
              <h2 className="serif" style={{ fontSize: 20, margin: "4px 0 0" }}>Connect your wallet</h2>
            </div>
            <button className="btn ghost sm" onClick={onClose}><Icon.x /></button>
          </div>
          <div className="modal-b col" style={{ gap: 12 }}>
            <p className="muted" style={{ fontSize: 13 }}>
              Sign in with your wallet to verify token ownership and list your Clanker token.
            </p>
            {error && <div className="warn-banner" style={{ color: "var(--risk)" }}>{error}</div>}
          </div>
          <div className="modal-f">
            <button className="btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680, width: "100%" }}>
        <div className="modal-h">
          <div>
            <div className="eyebrow">Clanker Token Marketplace</div>
            <h2 className="serif" style={{ fontSize: 20, margin: "4px 0 0" }}>List Clanker token</h2>
          </div>
          <button className="btn ghost sm" onClick={onClose}><Icon.x /></button>
        </div>

        <div className="modal-b col" style={{ gap: 16, maxHeight: "72vh", overflowY: "auto" }}>
          {/* Token picker */}
          <div className="col" style={{ gap: 8 }}>
            <span className="label">Your Clanker tokens</span>
            {ownedLoading ? (
              <div className="muted" style={{ padding: 18, textAlign: "center", fontSize: 13 }}>Loading your deployed tokens…</div>
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
                      style={{ padding: 12, textAlign: "left", borderColor: active ? "var(--accent)" : undefined, cursor: "pointer" }}
                    >
                      <div className="row" style={{ gap: 10 }}>
                        {token.imageUrl ? (
                          <img src={token.imageUrl} alt="" style={{ width: 34, height: 34, borderRadius: 17, objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 34, height: 34, borderRadius: 17, background: "var(--surface-2)" }} />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div className="mono" style={{ color: "var(--ink)", fontSize: 13, fontWeight: 600 }}>{token.name}</div>
                          <div className="muted-2" style={{ fontSize: 11 }}>${token.symbol} · {token.tokenAddress.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="muted" style={{ padding: 18, textAlign: "center", fontSize: 13 }}>No Clanker tokens found for this wallet.</div>
            )}
            <button className="btn ghost sm" type="button" onClick={() => setManualEntry((v) => !v)}>
              {manualEntry ? "Hide contract input" : "I don't see my token"}
            </button>
          </div>

          {manualEntry && (
            <div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <span className="label">Token contract address</span>
                <input className="input mono" value={contractAddress} onChange={(e) => { setContractAddress(e.target.value); setSelectedListingToken(null); }} placeholder="0x…" />
              </div>
              <button className="btn" type="button" disabled={checkingOwnership || !contractAddress} onClick={checkManualTokenOwnership}>
                {checkingOwnership ? "Checking…" : "Check ownership"}
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

          {/* Rights */}
          <div>
            <span className="label">Rights included in sale</span>
            <div className="grid grid-2" style={{ gap: 8 }}>
              {([
                ["full_package", "Full package"],
                ["admin_rights", "Admin / deployer rights"],
                ["fee_rights", "Creator fee rights"],
                ...(!vaultLocked ? [["vaulted_tokens", "Vaulted tokens"]] as [string, string][] : []),
                ["remaining_supply", "Remaining supply"],
              ] as [string, string][]).map(([key, label]) => (
                <label key={key} className="row" style={{ gap: 8, border: "1px solid var(--line)", borderRadius: 8, padding: "9px 10px", cursor: "pointer" }}>
                  <input type="checkbox" checked={saleRights.includes(key)} onChange={() => toggleSaleRight(key)} />
                  <span style={{ fontSize: 13 }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price / chain */}
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div>
              <span className="label">Price (USDC)</span>
              <input className="input mono" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <span className="label">Chain</span>
              <input className="input" value={chain} readOnly />
            </div>
          </div>

          <div>
            <span className="label">Sale notes</span>
            <textarea className="input" style={{ minHeight: 60, resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional terms, transfer steps, or what is included." />
          </div>

          {error && <div className="warn-banner" style={{ color: "var(--risk)" }}>{error}</div>}
        </div>

        <div className="modal-f">
          <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className="btn primary"
            disabled={submitting || !contractAddress || !price || saleRights.length === 0}
            onClick={handleSubmit}
          >
            {submitting ? "Signing & listing…" : "List token"}
          </button>
        </div>
      </div>
    </div>
  );
}
