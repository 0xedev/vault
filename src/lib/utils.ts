import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortAddr(addr: string) {
  return addr.slice(0, 6) + "\u2026" + addr.slice(-4);
}

export function fmtETH(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

export function fmtUSD(n: number) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function fmtUSDC(n: number) {
  return n.toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}

export function fmtCompact(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "m";
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 10000 ? 0 : 1) + "k";
  return n + "";
}

export function appColor(seed: string, idx: number): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const palettes = [
    ["#013A90", "#ACC2DC"], ["#063D91", "#7F9DC5"], ["#023A8F", "#EAF2F7"],
    ["#184A95", "#ACC2DC"], ["#033A8E", "#7F9DC5"], ["#013A8E", "#E6C97C"],
    ["#023A8F", "#ACC2DC"], ["#063D91", "#7F9DC5"],
  ];
  return palettes[Math.abs(h) % palettes.length][idx];
}
