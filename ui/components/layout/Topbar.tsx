import { Led } from "@/components/ui";

export function Topbar() {
  const now = new Date();
  const fecha = now
    .toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
  const hora = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  return (
    <header className="h-[60px] border-b border-line flex items-center px-[22px] gap-4 bg-graphite-900 flex-none">
      <div className="flex items-center gap-2.5">
        <Led color="green" />
        <span className="font-mono text-[11.5px] text-text-md">
          Central Motors — Bahía 4
        </span>
      </div>

      <Divider />

      <div className="flex items-center gap-1.5 font-mono text-[11px] text-text-lo">
        <Led color="orange" />
        3 diagnósticos activos
      </div>

      <Divider />

      <div className="font-mono text-[11px] text-text-lo">CONV. #4471 · en curso</div>

      <div className="flex-1" />

      <div className="font-mono text-[11px] text-text-lo">
        {fecha} · {hora}
      </div>

      <Divider />

      <div
        className="w-[30px] h-[30px] bg-steel-700 border border-line flex items-center justify-center font-display text-xs text-text-hi clip-cut-sm"
        aria-label="Técnico: MG"
      >
        MG
      </div>
    </header>
  );
}

function Divider() {
  return <div className="w-px h-[22px] bg-line" aria-hidden="true" />;
}
