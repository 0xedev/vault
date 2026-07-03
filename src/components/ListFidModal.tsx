"use client";

import React, { useEffect, useState } from "react";
import Icon from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ListingSuccessModal,
  type ListingSuccessShare,
} from "@/components/ListingSuccessModal";
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

const FONT_SANS = "'Geist', -apple-system, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

export default function ListFidModal({ onClose }: { onClose: () => void }) {
  const { address } = useWallet();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const [fid, setFid] = useState("");
  const [profile, setProfile] = useState<FidProfile | null>(null);
  const [price, setPrice] = useState("");
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<ListingSuccessShare | null>(null);

  const normalizedFid = fid.replace(/\D/g, "").trim();
  const profileHandle = profile?.username ? `@${profile.username}` : "";
  const canSubmit = Boolean(price && normalizedFid);

  const fetchFidProfile = async () => {
    if (!normalizedFid) return null;
    setFetchingProfile(true);
    setError("");
    try {
      const res = await fetch(
        `/api/hypersnap/user?fid=${encodeURIComponent(normalizedFid)}`,
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to fetch FID profile");
      const nextProfile = json.data as FidProfile;
      setProfile(nextProfile);
      return nextProfile;
    } catch (err) {
      setProfile(null);
      setError(
        err instanceof Error ? err.message : "Unable to fetch FID profile",
      );
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
      if (!fetchedProfile)
        throw new Error(
          "Enter a valid FID so Baseshire Hethaway can fetch the Farcaster profile.",
        );
      const metadata = {
        handle: fetchedProfile.username,
        fid: Number(normalizedFid),
        profileUrl: fetchedProfile.username
          ? `https://warpcast.com/${fetchedProfile.username}`
          : "",
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
            profileUrl: fetchedProfile.username
              ? `https://warpcast.com/${fetchedProfile.username}`
              : "",
            followers: fetchedProfile.followers,
            power_badge: fetchedProfile.powerBadge,
            includes: ["Account transfer"],
            metadataHash: metaHash,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Unable to submit FID listing");
      const listingId = String(
        json.data?.id || contractListingId || Date.now(),
      );
      setSuccess({
        title: profileHandle || `FID #${normalizedFid}`,
        text: `${profileHandle || `FID #${normalizedFid}`} — ${Number(price).toLocaleString("en-US")} USDC Farcaster listing on Baseshire Hethaway`,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(19,27,46,0.45)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="list-fid-title"
        className="w-full max-w-100 overflow-hidden"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(0,82,255,0.08)",
          borderRadius: 14,
          boxShadow: "0 12px 32px rgba(0,34,117,0.10)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(0,82,255,0.08)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 flex items-center justify-center shrink-0"
              style={{
                background: "#0035A8",
                borderRadius: 6,
                color: "#94AAFF",
                fontFamily: FONT_MONO,
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              FC
            </div>
            <div>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  color: "#747685",
                  textTransform: "uppercase",
                  lineHeight: "12px",
                }}
              >
                Farcaster listing
              </div>
              <div
                id="list-fid-title"
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#131B2E",
                  lineHeight: "18px",
                }}
              >
                List account
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center shrink-0"
            style={{ color: "#747685", borderRadius: 6 }}
            aria-label="Close"
          >
            <Icon.x className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div
          className="px-4 py-3 flex flex-col gap-3"
          style={{ maxHeight: "70vh", overflowY: "auto" }}
        >
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="fid-account"
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#444653",
                }}
              >
                Fid
              </Label>
              <Input
                id="fid-account"
                inputMode="numeric"
                value={fid}
                onChange={(e) => {
                  setFid(e.target.value.replace(/\D/g, ""));
                  setProfile(null);
                }}
                onBlur={fetchFidProfile}
                placeholder="12345"
                className="mt-1 h-9 focus-visible:ring-1"
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid #C4C5D5",
                  background: "#FFFFFF",
                  color: "#131B2E",
                }}
              />
            </div>
            <div>
              <Label
                htmlFor="fid-price"
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#444653",
                }}
              >
                Price (usdc)
              </Label>
              <Input
                id="fid-price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="8.5"
                className="mt-1 h-9 focus-visible:ring-1"
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid #C4C5D5",
                  background: "#FFFFFF",
                  color: "#131B2E",
                }}
              />
            </div>
          </div>

          {/* Precision-metrics profile row */}
          <div
            className="flex items-center gap-2.5 px-2.5 py-2"
            style={{
              background: "#F1F5F9",
              borderRadius: 8,
              border: "1px solid rgba(0,82,255,0.08)",
            }}
          >
            <div
              className="h-7 w-7 shrink-0 rounded-full overflow-hidden flex items-center justify-center"
              style={{
                boxShadow: `0 0 0 1.5px ${profile?.powerBadge ? "#DAA600" : "#3255C6"}`,
                background: "#DAE2FD",
              }}
            >
              {profile?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.imageUrl}
                  alt={profile.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: "#747685",
                  }}
                >
                  {fetchingProfile ? "…" : "?"}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {fetchingProfile ? (
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 12,
                    color: "#64748B",
                  }}
                >
                  Fetching profile…
                </span>
              ) : profile ? (
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: "#131B2E",
                    }}
                  >
                    {profile.displayName}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 11.5,
                      color: "#475569",
                    }}
                  >
                    {profileHandle}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      color: "#64748B",
                    }}
                  >
                    · {profile.followers.toLocaleString()} flw
                  </span>
                  {profile.powerBadge && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5"
                      style={{
                        height: 15,
                        borderRadius: 9999,
                        background: "#543E00",
                        color: "#DAA600",
                        fontFamily: FONT_MONO,
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      Power
                    </span>
                  )}
                </div>
              ) : (
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 12,
                    color: "#64748B",
                  }}
                >
                  Enter an FID to resolve the profile
                </span>
              )}
            </div>
          </div>

          {error && (
            <div
              className="flex items-start gap-2 px-2.5 py-2"
              style={{ background: "#FFDAD6", borderRadius: 8 }}
            >
              <span
                className="shrink-0 mt-1"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 9999,
                  background: "#93000A",
                }}
              />
              <p
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 12,
                  color: "#93000A",
                  lineHeight: "16px",
                  margin: 0,
                }}
              >
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: "1px solid rgba(0,82,255,0.08)" }}
        >
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9"
            style={{
              fontFamily: FONT_SANS,
              fontSize: 13,
              borderRadius: 8,
              background: "#F1F5F9",
              border: "1px solid rgba(0,82,255,0.08)",
              color: "#444653",
            }}
          >
            Close
          </Button>
          <Button
            onClick={submitListing}
            disabled={submitting || fetchingProfile || !canSubmit}
            className="h-9"
            style={{
              fontFamily: FONT_SANS,
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 8,
              background: "#002275",
              color: "#FFFFFF",
            }}
          >
            {submitting ? "Signing…" : "List account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
