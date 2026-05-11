"use client";

import React, { useState, useRef, useEffect } from "react";

type Option = { value: string; label: string };

export default function Dropdown({
  value,
  options,
  onChange,
  className = "",
  style,
}: {
  value: string;
  options: (string | Option)[];
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const items: Option[] = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  const selected = items.find((o) => o.value === value);

  return (
    <div ref={ref} className={`dropdown-root ${className}`} style={{ position: "relative", ...style }}>
      <button
        type="button"
        className="dropdown-trigger"
        onClick={() => setOpen(!open)}
      >
        <span className="trunc">{selected?.label || value}</span>
        <svg viewBox="0 0 10 6" width="10" height="6" style={{ flexShrink: 0, opacity: 0.5 }}>
          <path d="M0 0h10L5 6z" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="dropdown-menu">
          {items.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`dropdown-item${o.value === value ? " active" : ""}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
