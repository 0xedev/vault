export function shortAddr(addr: string) {
  return addr.slice(0, 6) + "\u2026" + addr.slice(-4);
}

export function fmtETH(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

export function fmtUSD(n: number) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
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
    ["#0E2848", "#7CFFB2"], ["#1A1240", "#A78BFA"], ["#0E2848", "#FFC56B"],
    ["#10182E", "#8BB7FF"], ["#221017", "#FF7A45"], ["#0A2540", "#E6C97C"],
    ["#152A2A", "#7CFFB2"], ["#190A2E", "#D4A0FF"],
  ];
  return palettes[Math.abs(h) % palettes.length][idx];
}
