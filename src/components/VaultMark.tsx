import Image from "next/image";

export default function VaultMark({ size = 36, className = "", priority = false }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/logo.jpeg"
      alt="Baseshire Hathaway"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: 4, flexShrink: 0 }}
      priority={priority}
    />
  );
}
