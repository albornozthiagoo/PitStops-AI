import Image from "next/image";

export function HexLogo({ size = 34 }: { size?: number }) {
  return (
    <Image
      src="/logo-icon.png"
      alt="PitStops AI"
      width={size}
      height={size}
      className="flex-none object-contain"
      priority
    />
  );
}
