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

type FidProfile = {
  fid: number;
  username: string;
  displayName: string;
  imageUrl: string;
  followers: number;
  powerBadge: boolean;
};

export default function ListFidModal({ onClose }: { onClose: () => void }) {
  const { address } = useWallet();
  const [fid, setFid] = useState("");
  const [profile, setProfile] = useState<FidProfile | null>(null);
  const [price, setPrice] = useState("");
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<ListingSuccessShare | null>(null);

  const normalizedFid = fid.replace(/\D/g, "").trim();
  const profileHandle = profile?.username ? `@${profile.username}` : "";
  const listingLabel = profileHandle || (normalizedFid ? `FID #${normalizedFid}` : "");
  const canSubmit = Boolean(price && normalizedFid);

  const fetchFidProfile = async () => {
    if (!normalizedFid) return null;
    setFetchingProfile(true);
    setError("");
    try {
      const res = await fetch(`/api/hypersnap/user?fid=${encodeURIComponent(normalizedFid)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to fetch FID profile");
      const nextProfile = json.data as FidProfile;
      setProfile(nextProfile);
      return nextProfile;
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : "Unable to fetch FID profile");
      return null;
    } finally {
      setFetchingProfile(false);
    }
  };

  const submitListing = async () => {
    if (!address) return;
    setSubmitting(true);
    setError("");
    try {
      const fetchedProfile = profile || (await fetchFidProfile());
      if (!fetchedProfile) throw new Error("Enter a valid FID so Vault can fetch the Farcaster profile.");
      const metadata = {
        handle: fetchedProfile.username,
        fid: Number(normalizedFid),
        profileUrl: fetchedProfile.username ? `https://warpcast.com/${fetchedProfile.username}` : "",
        followers: fetchedProfile.followers,
        price: Number(price),
        image: fetchedProfile.imageUrl,
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
          title: profileHandle || `FID #${normalizedFid}`,
          description: `Farcaster account ${profileHandle || `FID #${normalizedFid}`}`,
          price: Number(price),
          chainId: 8453,
          contractAddress: getEscrowAddress(),
          contractListingId,
          txHash,
          data: {
            fid: Number(normalizedFid),
            handle: fetchedProfile.username,
            imageUrl: fetchedProfile.imageUrl,
            profileUrl: fetchedProfile.username ? `https://warpcast.com/${fetchedProfile.username}` : "",
            followers: fetchedProfile.followers,
            power_badge: fetchedProfile.powerBadge,
            includes: ["Account transfer"],
            metadataHash: metaHash,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to submit FID listing");
      const listingId = String(json.data?.id || contractListingId || Date.now());
      setSuccess({
        title: profileHandle || `FID #${normalizedFid}`,
        text: `${profileHandle || `FID #${normalizedFid}`} — ${Number(price).toLocaleString("en-US")} USDC Farcaster listing on Vault`,
        url: `${window.location.origin}/farcaster?id=${encodeURIComponent(listingId)}`,
      });
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) return <ListingSuccessModal share={success} onClose={onClose} />;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-h">
          <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>List Farcaster account</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><Icon.x /></Button>
        </div>
        <div className="modal-b" style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "70vh", overflowY: "auto" }}>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="col" style={{ gap: 4 }}>
              <Label htmlFor="fid-account">FID</Label>
              <Input
                id="fid-account"
                className="mono"
                inputMode="numeric"
                value={fid}
                onChange={(e) => { setFid(e.target.value.replace(/\D/g, "")); setProfile(null); }}
                onBlur={fetchFidProfile}
                placeholder="12345"
              />
            </div>
            <div className="col" style={{ gap: 4 }}>
              <Label htmlFor="fid-price">Asking price (USDC)</Label>
              <Input id="fid-price" className="mono" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="8.5" />
            </div>
          </div>
          <div className="metric" style={{ padding: 12 }}>
            <span className="lab">Fetched from Hypersnap</span>
            <span className="val" style={{ fontSize: 13 }}>
              {fetchingProfile ? "Fetching..." : profile ? `${listingLabel} · ${profile.followers.toLocaleString()} followers` : "Enter an FID to fetch username and followers"}
            </span>
          </div>
          {error && <div className="warn-banner" style={{ color: "var(--risk)" }}>{error}</div>}
          <div className="modal-f">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={submitListing} disabled={submitting || fetchingProfile || !canSubmit}>{submitting ? "Signing..." : "List account"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
