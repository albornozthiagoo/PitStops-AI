import { cn } from "@/lib/cn";

const colors: Record<string, string> = {
  green: "bg-state-green shadow-[0_0_6px_1px_rgba(46,204,113,.7)] animate-pulse2",
  orange: "bg-action-orange shadow-[0_0_6px_1px_rgba(255,106,0,.35)]",
  red: "bg-state-red shadow-[0_0_6px_1px_rgba(229,57,53,.7)]",
};

export function Led({ color = "green" }: { color?: "green" | "orange" | "red" }) {
  return (
    <span
      className={cn("inline-block w-[7px] h-[7px] rounded-full flex-none", colors[color])}
      aria-hidden="true"
    />
  );
}
