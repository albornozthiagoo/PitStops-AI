import { ScanBar } from "@/components/ui";
import type { Mensaje } from "@/lib/types";

export function ChatBubble({ mensaje }: { mensaje: Mensaje }) {
  if (mensaje.autor === "tecnico") {
    return (
      <div className="self-end max-w-[62%] bg-steel-700 text-text-hi px-4 py-[13px] text-[13.5px] leading-relaxed clip-bubble-user">
        {mensaje.texto}
      </div>
    );
  }

  return (
    <div className="self-start max-w-[62%] bg-graphite-900 border border-line text-text-md pl-[18px] pr-4 py-[13px] text-[13.5px] leading-relaxed border-l-[3px] border-l-action-orange clip-bubble-sys">
      {mensaje.tag && (
        <span className="font-mono text-[10px] text-action-orange tracking-wide uppercase block mb-1.5">
          ◆ {mensaje.tag}
        </span>
      )}
      {mensaje.texto}
      {typeof mensaje.scanPct === "number" && (
        <div className="mt-2.5">
          <ScanBar pct={mensaje.scanPct} />
        </div>
      )}
    </div>
  );
}

export function ThinkingIndicator() {
  return (
    <div
      className="flex items-center gap-2 text-text-lo font-mono text-[11px] self-start pl-1"
      role="status"
      aria-live="polite"
    >
      <span className="w-1 h-1 bg-action-orange rounded-full animate-pulse2" />
      <span className="w-1 h-1 bg-action-orange rounded-full animate-pulse2 [animation-delay:.15s]" />
      <span className="w-1 h-1 bg-action-orange rounded-full animate-pulse2 [animation-delay:.3s]" />
      generando hipótesis
    </div>
  );
}
