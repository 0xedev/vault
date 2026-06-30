"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState } from "react";
import Icon from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/components/WalletProvider";
import { hashMetadata, writeListBundle, waitForDealId, parseContractError } from "@/lib/contract";
import { bundleAssetLabel, type BundleAssetKind } from "@/lib/data";
import { fmtUSDC } from "@/lib/utils";
import { parseUnits, type Address } from "viem";

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
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [price, setPrice] = useState("");
  const [assets, setAssets] = useState<BundleFormAsset[]>([emptyAsset()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalPrice = Number(price || 0);

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
          sellerAddress: address,
          name,
          description,
          imageUrl,
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
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 620, maxWidth: "100%" }}>
        <div className="modal-h">
          <div>
            <div className="eyebrow">Create Bundle Listing</div>
            <h2 className="serif" style={{ fontSize: 22, margin: "4px 0 0" }}>Bundled asset sale</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><Icon.x /></Button>
        </div>

        <div className="modal-b col" style={{ gap: 14 }}>
          <div>
            <Label htmlFor="bundle-name">Bundle name</Label>
            <Input
              id="bundle-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "$FED ecosystem bundle"'
              maxLength={120}
              aria-label="Bundle name"
            />
          </div>
          <div>
            <Label htmlFor="bundle-description">Description</Label>
            <Textarea
              id="bundle-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What assets are included and why buy them together?"
              maxLength={500}
              style={{ minHeight: 56, resize: "vertical" }}
              aria-label="Bundle description"
            />
          </div>
          <div>
            <Label htmlFor="bundle-image">Cover image</Label>
            <div className="row" style={{ gap: 8 }}>
              <Input
                id="bundle-image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Image URL or upload below"
                style={{ flex: 1 }}
              />
              <Button asChild variant="outline" size="sm" style={{ cursor: "pointer", flexShrink: 0 }}>
              <label>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                {uploadingImage ? "Uploading…" : "Upload"}
              </label>
              </Button>
            </div>
            {imageUrl && (
              <div style={{ marginTop: 6, width: "100%", aspectRatio: "16/10", borderRadius: 8, overflow: "hidden", background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                <img src={imageUrl} alt="Cover preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="bundle-price">Bundle price (USDC)</Label>
            <Input
              id="bundle-price"
              className="mono"
              type="number"
              min="0"
              step="0.0001"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              aria-label="Bundle price in ETH"
            />
          </div>

          <div>
            <div className="row between" style={{ alignItems: "center", marginBottom: 8 }}>
              <span className="label">Assets ({assets.length})</span>
              <Button variant="ghost" size="sm" onClick={addAsset} disabled={assets.length >= 10}>
                <Icon.upload style={{ transform: "rotate(180deg)" }} /> Add asset
              </Button>
            </div>

            {hasDuplicates && (
              <div className="warn-banner" style={{ fontSize: 12, marginBottom: 6 }}>
                Two assets have the same label and type. Please make them unique.
              </div>
            )}

            <div className="col" style={{ gap: 10 }}>
              {assets.map((asset, i) => (
                <Card key={i} className="bundle-form-asset" style={{ padding: 12 }}>
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <div className="row" style={{ gap: 8, alignItems: "center" }}>
                      <Select value={asset.kind} onValueChange={(value) => updateAsset(i, { kind: value as BundleAssetKind, data: {} })}>
                        <SelectTrigger aria-label={`Asset ${i + 1} type`} style={{ height: 30, minWidth: 160 }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSET_KINDS.map(({ kind }) => (
                            <SelectItem key={kind} value={kind}>{bundleAssetLabel(kind)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="smallcaps" style={{ color: "var(--ink-4)" }}>#{i + 1}</span>
                    </div>
                    {assets.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeAsset(i)} aria-label={`Remove asset ${i + 1}`}>
                        <Icon.x style={{ width: 13, height: 13, color: "var(--risk)" }} />
                      </Button>
                    )}
                  </div>

                  <div className="col" style={{ gap: 6 }}>
                    <Input
                      value={asset.label}
                      onChange={(e) => updateAsset(i, { label: e.target.value })}
                      placeholder={`${bundleAssetLabel(asset.kind)} name or identifier`}
                      maxLength={200}
                      style={{ height: 30 }}
                      aria-label={`Asset ${i + 1} label`}
                    />
                    <Input
                      value={asset.detail}
                      onChange={(e) => updateAsset(i, { detail: e.target.value })}
                      placeholder="Quick detail (e.g. 45K followers, 1200 DAU, 2M supply)"
                      maxLength={300}
                      style={{ height: 30 }}
                      aria-label={`Asset ${i + 1} detail`}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <span className="smallcaps" style={{ fontSize: 13 }}>Total bundle price</span>
            <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
              {fmtUSDC(totalPrice)} USDC
            </span>
          </div>

          {error && <div className="warn-banner" style={{ fontSize: 12, color: "var(--risk)" }}>{error}</div>}

        </div>

        <div className="modal-f bundle-modal-footer">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting ? "Signing..." : "Create bundle"}
          </Button>
        </div>
      </div>
    </div>
  );
}
