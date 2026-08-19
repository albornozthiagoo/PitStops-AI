import { Panel } from "@/components/ui";
import { cn } from "@/lib/cn";

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  delta: string;
  deltaColor: "green" | "yellow" | "red";
}

const deltaColors: Record<string, string> = {
  green: "text-state-green",
  yellow: "text-state-yellow",
  red: "text-state-red",
};

export function KpiCard({ label, value, unit, delta, deltaColor }: KpiCardProps) {
  return (
    <Panel className="px-[18px] pt-[18px] pb-4">
      <div className="font-mono text-[10.5px] tracking-wide uppercase text-text-lo">
        {label}
      </div>
      <div className="font-display text-[30px] font-bold text-text-hi mt-1.5">
        {value}
        {unit && <span className="text-[15px] text-text-lo ml-1">{unit}</span>}
      </div>
      <div className={cn("font-mono text-[11px] mt-1.5", deltaColors[deltaColor])}>
        {delta}
      </div>
    </Panel>
  );
}
