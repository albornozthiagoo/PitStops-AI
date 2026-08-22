import { Led } from "@/components/ui";

export function Topbar() {
  return (
    <header className="h-[60px] border-b border-line flex items-center px-[22px] gap-4 bg-graphite-900 flex-none">
      <div className="flex items-center gap-2.5">
        <Led color="green" />
        <span className="font-mono text-[11.5px] text-text-md">
          Central Motors — Bahía 4
        </span>
      </div>

      <div className="flex-1" />

      <div
        className="w-[30px] h-[30px] bg-steel-700 border border-line flex items-center justify-center font-display text-xs text-text-hi clip-cut-sm"
        aria-label="Técnico: MG"
      >
        MG
      </div>
    </header>
  );
}
