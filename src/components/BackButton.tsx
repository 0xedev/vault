"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  label?: string;
  className?: string;
}

export default function BackButton({ label = "Back", className = "" }: BackButtonProps) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`btn ghost sm back-btn ${className}`}
      onClick={() => router.back()}
      aria-label="Go back"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        color: "var(--ink-3)",
        padding: "4px 8px",
        marginBottom: 14,
      }}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M10 3L5 8l5 5" />
      </svg>
      {label}
    </button>
  );
}
