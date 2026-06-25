"use client";

import React, { useState } from "react";
import Icon from "@/components/icons";
import { useWallet } from "@/components/WalletProvider";
import { hashMetadata, writeListBundle, waitForDealId, parseContractError } from "@/lib/contract";
import { bundleAssetLabel, type BundleAssetKind } from "@/lib/data";
import { parseEther, type Address } from "viem";

const ASSET_KINDS: { kind: BundleAssetKind; icon: React.ReactNode }[] = [
  { kind: "nft_loan", icon: <Icon.loan /> },
  { kind: "mini_app", icon: <Icon.app /> },
  { kind: "x_account", icon: <Icon.xlogo /> },
  { kind: "farcaster", icon: <Icon.cast /> },
  { kind: "clanker", icon: <Icon.token /> },
];

interface BundleFormAsset {
  kind: BundleAssetKind;
  label: string;
  detail: string;
  price: number;
  data: Record<string, unknown>;
}

function emptyAsset(kind: BundleAssetKind = "clanker"): BundleFormAsset {
  return { kind, label: "", detail: "", price: 0, data: {} };
}

interface Props {
  onClose: () => void;
  onListed: () => void;
}

export default function ListBundleModal({ onClose, onListed }: Props) {
  const { address } = useWallet();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assets, setAssets] = useState<BundleFormAsset[]>([emptyAsset()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalPrice = assets.reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const updateAsset = (i: number, update: Partial<BundleFormAsset>) => {
    setAssets((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...update } : a)));
  };

  const addAsset = () => {
    if (assets.length >= 10) return;
    setAssets((prev) => [...prev, emptyAsset()]);
  };

  const removeAsset = (i: number) => {
    if (assets.length <= 1) return;
    setAssets((prev) => prev.filter((_, idx) => idx !== i));
  };

  const hasDuplicates = assets.length > 1 && assets.some((a, i) =>
    assets.findIndex((b, j) => j < i && b.label.trim().toLowerCase() === a.label.trim().toLowerCase() && b.kind === a.kind) >= 0
  );

  const canSubmit =
    name.trim().length >= 2 &&
    name.trim().length <= 120 &&
    assets.length >= 1 &&
    assets.every((a) => a.label.trim().length > 0 && a.label.trim().length <= 200) &&
    totalPrice > 0 &&
    !hasDuplicates;

  const handleSubmit = async () => {
    if (!address) return;
    setSubmitting(true);
    setError("");

    try {
      const metadata = { name, description, assets, createdAt: new Date().toISOString() };
      const metadataHash = hashMetadata(metadata);
      const priceWei = parseEther(String(totalPrice));

      const txHash = await writeListBundle(address as Address, priceWei, metadataHash as `0x${string}`);
      const contractListingId = await waitForDealId(txHash);

      const res = await fetch("/api/listings/bundle", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          totalPrice,
          assets: assets.map((a) => ({
            kind: a.kind,
            label: a.label,
            detail: a.detail,
            price: a.price,
            data: a.data,
          })),
          txHash,
          contractListingId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create bundle");

      onListed();
      onClose();
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620, maxHeight: "85vh", overflowY: "auto" }}>
        <div className="row between" style={{ marginBottom: 18 }}>
          <div>
            <div className="eyebrow">Create Bundle Listing</div>
            <h2 className="serif" style={{ fontSize: 22, margin: "4px 0 0" }}>Bundled asset sale</h2>
          </div>
          <button className="btn ghost sm" onClick={onClose} aria-label="Close"><Icon.x /></button>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div>
            <span className="label">Bundle name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "$FED ecosystem bundle"'
              maxLength={120}
              aria-label="Bundle name"
            />
          </div>
          <div>
            <span className="label">Description</span>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What assets are included and why buy them together?"
              maxLength={500}
              style={{ minHeight: 56, resize: "vertical", padding: "10px 12px" }}
              aria-label="Bundle description"
            />
          </div>

          <div>
            <div className="row between" style={{ alignItems: "center", marginBottom: 8 }}>
              <span className="label">Assets ({assets.length})</span>
              <button className="btn ghost sm" onClick={addAsset} disabled={assets.length >= 10}>
                <Icon.upload style={{ transform: "rotate(180deg)" }} /> Add asset
              </button>
            </div>

            {hasDuplicates && (
              <div className="warn-banner" style={{ fontSize: 12, marginBottom: 6 }}>
                Two assets have the same label and type. Please make them unique.
              </div>
            )}

            <div className="col" style={{ gap: 10 }}>
              {assets.map((asset, i) => (
                <div key={i} className="bundle-form-asset card" style={{ padding: 12 }}>
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <div className="row" style={{ gap: 8, alignItems: "center" }}>
                      <select
                        className="input"
                        value={asset.kind}
                        onChange={(e) => updateAsset(i, { kind: e.target.value as BundleAssetKind, data: {} })}
                        style={{ height: 30, padding: "0 8px" }}
                        aria-label={`Asset ${i + 1} type`}
                      >
                        {ASSET_KINDS.map(({ kind }) => (
                          <option key={kind} value={kind}>{bundleAssetLabel(kind)}</option>
                        ))}
                      </select>
                      <span className="smallcaps" style={{ color: "var(--ink-4)" }}>#{i + 1}</span>
                    </div>
                    {assets.length > 1 && (
                      <button className="btn ghost sm" onClick={() => removeAsset(i)} aria-label={`Remove asset ${i + 1}`}>
                        <Icon.x style={{ width: 13, height: 13, color: "var(--risk)" }} />
                      </button>
                    )}
                  </div>

                  <div className="col" style={{ gap: 6 }}>
                    <input
                      className="input"
                      value={asset.label}
                      onChange={(e) => updateAsset(i, { label: e.target.value })}
                      placeholder={`${bundleAssetLabel(asset.kind)} name or identifier`}
                      maxLength={200}
                      style={{ height: 30 }}
                      aria-label={`Asset ${i + 1} label`}
                    />
                    <input
                      className="input"
                      value={asset.detail}
                      onChange={(e) => updateAsset(i, { detail: e.target.value })}
                      placeholder="Quick detail (e.g. 45K followers, 1200 DAU, 2M supply)"
                      maxLength={300}
                      style={{ height: 30 }}
                      aria-label={`Asset ${i + 1} detail`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <span className="smallcaps" style={{ fontSize: 13 }}>Total bundle price</span>
            <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
              {totalPrice.toFixed(4)} Ξ
            </span>
          </div>

          {error && <div className="warn-banner" style={{ fontSize: 12, color: "var(--risk)" }}>{error}</div>}

          <div className="row" style={{ gap: 8 }}>
            <button className="btn" style={{ flex: 1 }} onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="btn primary lg" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting || !canSubmit}>
              {submitting ? "Signing…" : `List bundle for ${totalPrice.toFixed(4)} Ξ`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
