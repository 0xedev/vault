"use client";

import React, { useState } from "react";
import Icon from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function ListFidModal({ onClose }: { onClose: () => void }) {
  const { address } = useWallet();
  const [identifierMode, setIdentifierMode] = useState<"handle" | "fid">("handle");
  const [handle, setHandle] = useState("");
  const [fid, setFid] = useState("");
  const [followers, setFollowers] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<ListingSuccessShare | null>(null);

  const normalizedHandle = handle.replace(/^@/, "").trim();
  const normalizedFid = fid.replace(/\D/g, "").trim();
  const isFidMode = identifierMode === "fid";
  const profileUrl = !isFidMode && normalizedHandle ? `https://warpcast.com/${normalizedHandle}` : "";
  const listingLabel = isFidMode ? `FID #${normalizedFid}` : `@${normalizedHandle}`;
  const canSubmit = Boolean(price && (isFidMode ? normalizedFid : normalizedHandle));

  const fetchProfilePreview = async () => {
    if (isFidMode || !profileUrl || imageUrl) return imageUrl;
    setFetchingProfile(true);
    try {
      const res = await fetch(`/api/og-preview?url=${encodeURIComponent(profileUrl)}`);
      const json = await res.json().catch(() => ({}));
      if (json.image) {
        setImageUrl(json.image);
        return String(json.image);
      }
    } catch {
      // Listing can still proceed; profile URL is included in metadata.
    } finally {
      setFetchingProfile(false);
    }
    return "";
  };

  const submitListing = async () => {
    if (!address) return;
    setSubmitting(true);
    setError("");
    try {
      const profileImage = await fetchProfilePreview();
      const metadata = {
        handle: isFidMode ? "" : normalizedHandle,
        fid: Number(normalizedFid || 0),
        profileUrl,
        followers: Number(followers || 0),
        price: Number(price),
        image: profileImage || imageUrl,
        kind: "Farcaster account",
        createdAt: new Date().toISOString(),
      };
      const metaHash = hashMetadata(metadata);
      const txHash = await writeListDeal(
        address as Address,
        parseUnits(price || "0", 6),
        metaHash,
        "farcaster",
      );
      const contractListingId = await waitForDealId(txHash);
      const res = await fetch("/api/marketplace/farcaster", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress: address,
          title: listingLabel,
          description: `Farcaster account ${listingLabel}`,
          price: Number(price),
          chainId: 8453,
          contractAddress: getEscrowAddress(),
          contractListingId,
          txHash,
          data: {
            fid: Number(normalizedFid || 0),
            handle: isFidMode ? "" : normalizedHandle,
            imageUrl: profileImage || imageUrl,
            profileUrl,
            channel: "",
            followers: Number(followers || 0),
            casts_30d: 0,
            rev_30d: 0,
            power_badge: false,
            includes: ["Account transfer"],
            metadataHash: metaHash,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Unable to submit FID listing");
      const listingId = String(json.data?.id || contractListingId || Date.now());
      setSuccess({
        title: listingLabel,
        text: `${listingLabel} — ${Number(price).toLocaleString("en-US")} USDC Farcaster listing on Vault`,
        url: `${window.location.origin}/farcaster?id=${encodeURIComponent(listingId)}`,
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
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <div className="modal-h">
          <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>
            List Farcaster account
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon.x />
          </Button>
        </div>
        <div
          className="modal-b"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          <div className="seg" role="tablist" aria-label="Farcaster identifier type">
            <button
              type="button"
              className={!isFidMode ? "active" : ""}
              onClick={() => {
                setIdentifierMode("handle");
                setError("");
              }}
            >
              Handle
            </button>
            <button
              type="button"
              className={isFidMode ? "active" : ""}
              onClick={() => {
                setIdentifierMode("fid");
                setError("");
              }}
            >
              FID
            </button>
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="col" style={{ gap: 4 }}>
              <Label htmlFor="fid-account">{isFidMode ? "FID" : "Handle"}</Label>
              {isFidMode ? (
                <Input
                  id="fid-account"
                  className="mono"
                  inputMode="numeric"
                  value={fid}
                  onChange={(e) => setFid(e.target.value.replace(/\D/g, ""))}
                  placeholder="12345"
                />
              ) : (
                <Input
                  id="fid-account"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  onBlur={fetchProfilePreview}
                  placeholder="@founder"
                />
              )}
            </div>
            <div className="col" style={{ gap: 4 }}>
              <Label htmlFor="fid-followers">Followers</Label>
              <Input
                id="fid-followers"
                className="mono"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                placeholder="25000"
              />
            </div>
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="col" style={{ gap: 4 }}>
              <Label htmlFor="fid-price">Asking price (USDC)</Label>
              <Input
                id="fid-price"
                className="mono"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="8.5"
              />
            </div>
            <div className="metric" style={{ padding: 12 }}>
              <span className="lab">Profile</span>
              <span className="val" style={{ fontSize: 13 }}>
                {fetchingProfile ? "Fetching..." : isFidMode ? listingLabel || "Add FID" : profileUrl || "Add handle"}
              </span>
            </div>
          </div>
          {error && (
            <div className="warn-banner" style={{ color: "var(--risk)" }}>
              {error}
            </div>
          )}

          <div className="modal-f">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={submitListing}
              disabled={submitting || !canSubmit}
            >
              {submitting ? "Signing..." : "List account"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
