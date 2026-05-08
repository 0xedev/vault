export default function VaultMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id="vm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7CFFB2"/>
          <stop offset="1" stopColor="#3FAB78"/>
        </linearGradient>
      </defs>
      <rect x="2.5" y="2.5" width="27" height="27" rx="6" stroke="url(#vm-g)" strokeWidth="1.5"/>
      <path d="M9 9 L16 22 L23 9" stroke="url(#vm-g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="16" cy="13" r="1.6" fill="#7CFFB2"/>
    </svg>
  );
}
