import { cn } from "@/lib/cn";

type BadgeStatus = "critica" | "media" | "baja" | "neutral";

const styles: Record<BadgeStatus, string> = {
  critica: "bg-state-red/10 text-[#ff8a85] border-state-red/35",
  media: "bg-state-yellow/10 text-[#ffd166] border-state-yellow/35",
  baja: "bg-state-green/10 text-[#7ee8ac] border-state-green/35",
  neutral: "bg-titanium-500/15 text-titanium-300 border-line",
};

const labels: Record<BadgeStatus, string> = {
  critica: "Crítica",
  media: "Media",
  baja: "Baja",
  neutral: "—",
};

export function Badge({
  status,
  children,
}: {
  status: BadgeStatus;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[10.5px] font-semibold uppercase tracking-wide inline-flex items-center gap-1.5 px-2.5 py-1 clip-badge border",
        styles[status]
      )}
    >
      {children ?? labels[status]}
    </span>
  );
}
