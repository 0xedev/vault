"use client";

import React, { useState } from "react";
import Icon from "@/components/icons";
import { shareAsCast } from "@/lib/farcaster-sdk";

type Props = {
  title: string;
  text: string;
  url: string;
  onClose: () => void;
  onCopied?: () => void;
};

export default function ShareListingModal({ title, text, url, onClose, onCopied }: Props) {
  const [notice, setNotice] = useState("");
  const castText = text.length > 260 ? `${text.slice(0, 257)}...` : text;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Link copied.");
      onCopied?.();
    } catch {
      setNotice("Unable to copy link.");
    }
  };

  const composeCast = async () => {
    const result = await shareAsCast(castText, url);
    setNotice(result ? "Cast composer opened." : "Unable to open Farcaster composer.");
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal share-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-h">
          <div>
            <div className="eyebrow">Share listing</div>
            <h3 className="serif" style={{ margin: "4px 0 0", fontSize: 22 }}>{title}</h3>
          </div>
          <button type="button" className="btn sm" onClick={onClose} aria-label="Close share modal">
            <Icon.x />
          </button>
        </div>
        <div className="modal-b col" style={{ gap: 12 }}>
          <div className="share-preview">
            <strong>{text}</strong>
            <span>{url}</span>
          </div>
          <button type="button" className="btn primary" onClick={composeCast}>
            <Icon.cast /> Share to Farcaster
          </button>
          <button type="button" className="btn" onClick={copyLink}>
            <Icon.link /> Copy link
          </button>
          {notice && <div className="muted-2" style={{ fontSize: 12 }}>{notice}</div>}
        </div>
      </div>
    </div>
  );
}
