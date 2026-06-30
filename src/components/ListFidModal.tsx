"use client";

import React, { useState } from "react";
import Icon from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const normalizedHandle = handle.replace(/^@/, "").trim();
  const profileUrl = normalizedHandle ? `https://warpcast.com/${normalizedHandle}` : "";

  const fetchProfilePreview = async () => {
    if (!profileUrl || imageUrl) return imageUrl;
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
        handle: normalizedHandle,
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
      );
      const contractListingId = await waitForDealId(txHash);
      const res = await fetch("/api/marketplace/farcaster", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress: address,
          title: normalizedHandle,
          description: `Farcaster account @${normalizedHandle}`,
          price: Number(price),
          chainId: 8453,
          contractAddress: getEscrowAddress(),
          contractListingId,
          txHash,
          data: {
            fid: 0,
            handle: normalizedHandle,
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
      setDone("Listed. Buyers can fund escrow and confirm transfer with the seller.");
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setSubmitting(false);
    }
  };

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
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="col" style={{ gap: 4 }}>
              <Label htmlFor="fid-account">Account</Label>
              <Input
                id="fid-account"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onBlur={fetchProfilePreview}
                placeholder="@founder"
              />
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
                {fetchingProfile ? "Fetching..." : profileUrl || "Add account"}
              </span>
            </div>
          </div>
          {error && (
            <div className="warn-banner" style={{ color: "var(--risk)" }}>
              {error}
            </div>
          )}

          {done && (
            <Card style={{ padding: 14, background: "rgba(127,157,197,0.12)", border: "1px solid var(--accent)" }}>
              <div className="pill funded" style={{ width: "fit-content" }}>
                <span className="pdot" />
                {done}
              </div>
            </Card>
          )}
          <div className="modal-f">
            <Button
              variant="outline"
                onClick={() => {
                  onClose();
                  setDone("");
                }}
            >
              Close
            </Button>
            {!done ? (
              <Button
                onClick={submitListing}
                disabled={submitting || !normalizedHandle || !price}
              >
                {submitting ? "Signing..." : "List account"}
              </Button>
            ) : (
              <Button onClick={onClose}>
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
