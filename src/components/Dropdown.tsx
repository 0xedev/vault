"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const items: Option[] = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  return (
    <div className={`dropdown-root ${className}`} style={style}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="dropdown-trigger">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="dropdown-menu">
          {items.map((o) => (
            <SelectItem key={o.value} value={o.value} className="dropdown-item">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
