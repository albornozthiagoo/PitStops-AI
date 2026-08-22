import Link from "next/link";
import { Panel } from "@/components/ui";
import { getConversaciones } from "@/lib/services/conversaciones";

// Depende de la base en cada visita — nunca prerenderizar en build time.
export const dynamic = "force-dynamic";

const ESTADO_LABEL: Record<string, string> = {
  DIAGNOSTICANDO: "Diagnosticando",
  EN_COLA: "En cola",
  COMPLETADO: "Completado",
};

export default async function ConversacionesPage() {
  const conversaciones = await getConversaciones();

  return (
    <div className="h-full overflow-auto p-7">
      <div className="font-mono text-[11px] tracking-[.14em] uppercase text-action-orange mb-1.5 flex items-center gap-2">
        <span className="w-3.5 h-px bg-action-orange" />
        WhatsApp · prediagnóstico
      </div>
      <h2 className="text-2xl mb-[18px]">Conversaciones</h2>

      <Panel>
        <div className="grid grid-cols-[1.4fr_1.6fr_1fr_130px_140px] gap-3 px-4 py-3 text-text-lo font-mono text-[10px] tracking-wide uppercase border-b border-line">
          <div>Cliente</div>
          <div>Último mensaje</div>
          <div>Estado</div>
          <div>Control</div>
          <div>Actualizado</div>
        </div>

        {conversaciones.length === 0 ? (
          <p className="px-4 py-6 text-text-lo text-sm">Todavía no hay conversaciones.</p>
        ) : (
          conversaciones.map((c) => (
            <Link
              key={c.id}
              href={`/conversaciones/${c.id}`}
              className="grid grid-cols-[1.4fr_1.6fr_1fr_130px_140px] gap-3 items-center px-4 py-[15px] border-b border-line-soft hover:bg-steel-800 transition-colors text-left"
            >
              <div>
                <div className="text-text-hi">{c.clienteNombre}</div>
                <div className="font-mono text-[11px] text-text-lo">
                  {c.vehiculoPatente ?? c.clienteTelefono ?? "—"}
                </div>
              </div>
              <div className="text-text-md text-[13px] truncate">{c.ultimoMensaje ?? "—"}</div>
              <div className="text-text-md text-[13px]">{ESTADO_LABEL[c.estado] ?? c.estado}</div>
              <div>
                <span
                  className={
                    c.controladoPor === "TECNICO"
                      ? "font-mono text-[10.5px] font-semibold uppercase text-[#7ee8ac]"
                      : "font-mono text-[10.5px] font-semibold uppercase text-action-orange"
                  }
                >
                  {c.controladoPor === "TECNICO" ? "Técnico" : "IA"}
                </span>
              </div>
              <div className="font-mono text-[11.5px] text-text-lo">{c.actualizado}</div>
            </Link>
          ))
        )}
      </Panel>
    </div>
  );
}
