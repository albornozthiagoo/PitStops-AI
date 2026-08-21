import { ProbBar } from "@/components/ui";
import type { Hipotesis } from "@/generated/prisma/client";

export function HypothesisRow({ hipotesis }: { hipotesis: Hipotesis }) {
  return (
    <div className="flex items-center gap-3.5 py-3 border-b border-line-soft last:border-b-0">
      <div className="w-[220px] flex-none text-text-hi font-medium">
        {hipotesis.nombre}
      </div>
      <div className="flex-1">
        <ProbBar pct={hipotesis.probabilidad} />
      </div>
      <div className="w-11 flex-none font-mono text-action-orange text-right text-xs">
        {hipotesis.probabilidad}%
      </div>
    </div>
  );
}
