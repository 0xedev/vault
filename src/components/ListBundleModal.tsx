"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState } from "react";
import Icon from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ListingSuccessModal, type ListingSuccessShare } from "@/components/ListingSuccessModal";
import { useWallet } from "@/components/WalletProvider";
import { hashMetadata, writeListBundle, waitForDealId, parseContractError } from "@/lib/contract";
import { bundleAssetLabel, type BundleAssetKind } from "@/lib/data";
import { fmtUSDC } from "@/lib/utils";
import { parseUnits, type Address } from "viem";

// No nft_loan — bundles are for accounts, apps, and tokens
const ASSET_KINDS: { kind: BundleAssetKind; icon: React.ReactNode; color: string }[] = [
  { kind: "mini_app",   icon: <Icon.app />,   color: "#F97316" },
  { kind: "x_account", icon: <Icon.xlogo />, color: "#52525B" },
  { kind: "farcaster",  icon: <Icon.cast />,  color: "#8B5CF6" },
  { kind: "clanker",   icon: <Icon.token />, color: "#10B981" },
];

interface BundleFormAsset {
  uid: string;
  kind: BundleAssetKind;
  label: string;
  detail: string;
  price: number;
  data: Record<string, unknown>;
}

let _uid = 0;
function emptyAsset(kind: BundleAssetKind = "mini_app"): BundleFormAsset {
  return { uid: `asset-${_uid++}`, kind, label: "", detail: "", price: 0, data: {} };
}

interface Props {
  onClose: () => void;
  onListed: () => void;
}

export default function ListBundleModal({ onClose, onListed }: Props) {
  const { address } = useWallet();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [price, setPrice] = useState("");
  const [assets, setAssets] = useState<BundleFormAsset[]>([emptyAsset()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<ListingSuccessShare | null>(null);

  const totalPrice = Number(price || 0);

  const updateAsset = (uid: string, update: Partial<BundleFormAsset>) => {
    setAssets((prev) => prev.map((a) => (a.uid === uid ? { ...a, ...update } : a)));
  };

  const addAsset = () => {
    if (assets.length >= 10) return;
    setAssets((prev) => [...prev, emptyAsset()]);
  };

  const removeAsset = (uid: string) => {
    if (assets.length <= 1) return;
    setAssets((prev) => prev.filter((a) => a.uid !== uid));
  };

  // Duplicate check: same label AND same kind (ignore blank labels)
  const duplicateUids = new Set<string>();
  assets.forEach((a, i) => {
    if (!a.label.trim()) return;
    const isDup = assets.some(
      (b, j) =>
        j !== i &&
        b.kind === a.kind &&
        b.label.trim().toLowerCase() === a.label.trim().toLowerCase()
    );
    if (isDup) duplicateUids.add(a.uid);
  });
  const hasDuplicates = duplicateUids.size > 0;

  const canSubmit =
    name.trim().length >= 2 &&
    name.trim().length <= 120 &&
    assets.length >= 1 &&
    assets.every((a) => a.label.trim().length > 0 && a.label.trim().length <= 200) &&
    totalPrice > 0 &&
    !hasDuplicates;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", credentials: "include", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setImageUrl(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!address) return;
    setSubmitting(true);
    setError("");
    try {
      const metadata = { name, description, totalPrice, assets, imageUrl, createdAt: new Date().toISOString() };
      const metadataHash = hashMetadata(metadata);
      const priceWei = parseUnits(String(totalPrice), 6);
      const txHash = await writeListBundle(address as Address, priceWei, metadataHash as `0x${string}`);
      const contractListingId = await waitForDealId(txHash);

      const res = await fetch("/api/listings/bundle", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress: address, name, description, imageUrl, totalPrice,
          assets: assets.map((a) => ({ kind: a.kind, label: a.label, detail: a.detail, price: a.price, data: a.data })),
          txHash, contractListingId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create bundle");
      const listingId = String(json.data?.id || Date.now());
      onListed();
      setSuccess({
        title: name,
        text: `${name} — ${fmtUSDC(totalPrice)} USDC bundled listing on Baseshire Hethaway`,
        url: `${window.location.origin}/market?tab=bundles&id=${encodeURIComponent(listingId)}`,
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

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 640, maxWidth: "100%" }}>
        <div className="modal-h">
          <div>
            <div className="eyebrow">Create Bundle</div>
            <h2 className="serif" style={{ fontSize: 20, margin: "4px 0 0" }}>Bundle multiple assets</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><Icon.x /></Button>
        </div>

        <div className="modal-b col" style={{ gap: 14, maxHeight: "72vh", overflowY: "auto" }}>

          {/* Bundle name */}
          <div>
            <Label htmlFor="bundle-name" style={{ fontSize: 12 }}>Bundle name</Label>
            <Input
              id="bundle-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "$FED ecosystem bundle"'
              maxLength={120}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="bundle-description" style={{ fontSize: 12 }}>Description</Label>
            <Textarea
              id="bundle-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What assets are included and why buy them together?"
              maxLength={500}
              style={{ minHeight: 52, resize: "vertical", fontSize: 13 }}
            />
          </div>

          {/* Price */}
          <div>
            <Label htmlFor="bundle-price" style={{ fontSize: 12 }}>Bundle price (USDC)</Label>
            <Input
              id="bundle-price"
              className="mono"
              type="number"
              min="0"
              step="0.0001"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Cover image */}
          <div>
            <Label htmlFor="bundle-image" style={{ fontSize: 12 }}>Cover image</Label>
            <div className="row" style={{ gap: 8 }}>
              <Input
                id="bundle-image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste URL or upload"
                style={{ flex: 1, fontSize: 13 }}
              />
              <Button asChild variant="outline" size="sm" style={{ cursor: "pointer", flexShrink: 0 }}>
                <label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                  {uploadingImage ? "Uploading…" : "Upload"}
                </label>
              </Button>
            </div>
            {imageUrl && (
              <div style={{ marginTop: 6, width: "100%", aspectRatio: "16/8", borderRadius: 8, overflow: "hidden", background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                <img src={imageUrl} alt="Cover preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>

          {/* Assets section */}
          <div>
            <div className="row between" style={{ alignItems: "center", marginBottom: 10 }}>
              <div className="col" style={{ gap: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Assets ({assets.length}/10)
                </span>
                <span style={{ fontSize: 11, color: "var(--ink-4)" }}>Add the accounts, apps, or tokens in this bundle</span>
              </div>
              <Button variant="ghost" size="sm" onClick={addAsset} disabled={assets.length >= 10} style={{ fontSize: 12 }}>
                + Add asset
              </Button>
            </div>

            {hasDuplicates && (
              <div className="warn-banner" style={{ fontSize: 12, marginBottom: 8 }}>
                Two assets share the same name and type — rename one to make it unique.
              </div>
            )}

            <div className="col" style={{ gap: 10 }}>
              {assets.map((asset, i) => (
                <div
                  key={asset.uid}
                  className="card"
                  style={{
                    padding: "12px 14px",
                    border: duplicateUids.has(asset.uid) ? "1px solid var(--risk)" : undefined,
                  }}
                >
                  {/* Header row: index + remove */}
                  <div className="row between" style={{ marginBottom: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--ink-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Asset #{i + 1}
                    </span>
                    {assets.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAsset(asset.uid)}
                        aria-label={`Remove asset ${i + 1}`}
                        style={{ width: 22, height: 22 }}
                      >
                        <Icon.x style={{ width: 11, height: 11, color: "var(--risk)" }} />
                      </Button>
                    )}
                  </div>

                  {/* Asset type — pill chips */}
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: "var(--ink-3)", display: "block", marginBottom: 6 }}>Type</span>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                      {ASSET_KINDS.map(({ kind, icon, color }) => {
                        const active = asset.kind === kind;
                        return (
                          <button
                            key={kind}
                            type="button"
                            onClick={() => updateAsset(asset.uid, { kind: kind as BundleAssetKind })}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "4px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: active ? 600 : 400,
                              border: `1px solid ${active ? color : "var(--line)"}`,
                              background: active
                                ? `color-mix(in oklab, ${color} 12%, transparent)`
                                : "transparent",
                              color: active ? color : "var(--ink-3)",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span style={{ display: "flex", width: 12, height: 12, color: active ? color : "var(--ink-4)" }}>{icon}</span>
                            {bundleAssetLabel(kind)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Name + detail */}
                  <div className="col" style={{ gap: 7 }}>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--ink-3)", display: "block", marginBottom: 4 }}>
                        {bundleAssetLabel(asset.kind)} name / identifier
                      </span>
                      <Input
                        value={asset.label}
                        onChange={(e) => updateAsset(asset.uid, { label: e.target.value })}
                        placeholder={
                          asset.kind === "x_account" ? "@handle"
                          : asset.kind === "farcaster" ? "@handle or FID"
                          : asset.kind === "clanker" ? "Token name or $SYMBOL"
                          : "App name"
                        }
                        maxLength={200}
                        style={{ height: 34, fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--ink-3)", display: "block", marginBottom: 4 }}>Quick detail (optional)</span>
                      <Input
                        value={asset.detail}
                        onChange={(e) => updateAsset(asset.uid, { detail: e.target.value })}
                        placeholder="e.g. 45K followers, 1200 DAU, 2M supply"
                        maxLength={300}
                        style={{ height: 34, fontSize: 13 }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total price summary */}
          <div className="row between" style={{ alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <span className="smallcaps" style={{ fontSize: 12 }}>Total bundle price</span>
            <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>
              {fmtUSDC(totalPrice)} USDC
            </span>
          </div>

          {error && <div className="warn-banner" style={{ fontSize: 12, color: "var(--risk)" }}>{error}</div>}
        </div>

        <div className="modal-f">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting ? "Signing…" : "Create bundle"}
          </Button>
        </div>
      </div>
    </div>
  );
}
