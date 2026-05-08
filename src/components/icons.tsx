import React from "react";

const icons = {
  home: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M2 7l6-5 6 5v7a1 1 0 0 1-1 1h-3v-5H6v5H3a1 1 0 0 1-1-1V7z"/></svg>
  ),
  market: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>
  ),
  loan: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><circle cx="8" cy="8" r="6"/><path d="M6 9c0 1 1 1.5 2 1.5S10 10 10 9c0-2-4-1-4-3 0-1 1-1.5 2-1.5S10 5 10 6"/><path d="M8 4v.5M8 11.5v.5"/></svg>
  ),
  escrow: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><rect x="2.5" y="6" width="11" height="8" rx="1.5"/><path d="M5 6V4a3 3 0 0 1 6 0v2"/><circle cx="8" cy="10" r="1"/></svg>
  ),
  deal: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M2 6h12M2 10h12"/><path d="M5 3l-3 3 3 3M11 7l3 3-3 3"/></svg>
  ),
  asset: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M8 2l6 3.5v5L8 14l-6-3.5v-5L8 2z"/><path d="M2 5.5L8 9l6-3.5M8 9v5"/></svg>
  ),
  shield: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M8 1l6 2v5c0 4-3 6.5-6 7-3-.5-6-3-6-7V3l6-2z"/><path d="M5.5 8l2 2 3-3.5"/></svg>
  ),
  bell: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M3 11h10l-1.5-2V6a3.5 3.5 0 0 0-7 0v3L3 11z"/><path d="M6 13a2 2 0 0 0 4 0"/></svg>
  ),
  search: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>
  ),
  arrow: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M3 8h10M9 4l4 4-4 4"/></svg>
  ),
  check: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M3 8.5l3 3 7-7"/></svg>
  ),
  x: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M4 4l8 8M12 4l-8 8"/></svg>
  ),
  warn: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M8 2l6.5 11h-13L8 2z"/><path d="M8 6.5v3M8 11v.5"/></svg>
  ),
  clock: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 2"/></svg>
  ),
  dot: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" {...p}><circle cx="8" cy="8" r="3"/></svg>
  ),
  filter: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M2 4h12M4 8h8M6 12h4"/></svg>
  ),
  send: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M2 8L14 2l-3.5 12-2.5-5L2 8z"/></svg>
  ),
  more: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" {...p}><circle cx="3" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="13" cy="8" r="1.4"/></svg>
  ),
  app: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><rect x="2.5" y="3" width="11" height="10" rx="1.5"/><path d="M2.5 6h11"/><circle cx="4.5" cy="4.5" r="0.4" fill="currentColor"/><circle cx="6" cy="4.5" r="0.4" fill="currentColor"/></svg>
  ),
  xlogo: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" {...p}><path d="M11.7 2H13.8L9.3 7.1L14.6 14H10.5L7.2 9.7L3.5 14H1.4L6.2 8.5L1.1 2H5.3L8.3 5.9L11.7 2zM10.9 12.7H12.1L4.8 3.2H3.5L10.9 12.7z"/></svg>
  ),
  cast: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M3 13V5a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v8"/><path d="M2 5h2M12 5h2M5 13h2.5M8.5 13H11"/></svg>
  ),
  follow: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><circle cx="6" cy="6" r="2.5"/><path d="M2 13a4 4 0 0 1 8 0"/><path d="M12 5v4M14 7h-4"/></svg>
  ),
  spark: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M2 12l3-4 2 2 3-5 4 7"/></svg>
  ),
  link: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M7 9a2.5 2.5 0 0 0 3.5 0l2-2a2.5 2.5 0 0 0-3.5-3.5L8 4.5"/><path d="M9 7a2.5 2.5 0 0 0-3.5 0l-2 2a2.5 2.5 0 0 0 3.5 3.5L8 11.5"/></svg>
  ),
  upload: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M8 11V3M5 6l3-3 3 3"/><path d="M3 11v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2"/></svg>
  ),
};

export default icons;
