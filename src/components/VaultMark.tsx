export default function VaultMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.jpeg"
      alt="Baseshire Hathaway"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: 4, flexShrink: 0 }}
    />
  );
}
