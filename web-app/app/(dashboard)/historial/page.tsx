import { getHistorial } from "@/lib/services/historial";
import { HistorialTable } from "@/components/historial/HistorialTable";

// Depende de la base en cada visita — nunca prerenderizar en build time.
export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  const historial = await getHistorial();

  return (
    <div className="h-full overflow-auto p-7">
      <div className="font-mono text-[11px] tracking-[.14em] uppercase text-action-orange mb-1.5 flex items-center gap-2">
        <span className="w-3.5 h-px bg-action-orange" />
        Registro de unidades
      </div>
      <h2 className="text-2xl mb-[18px]">Historial de vehículos</h2>

      <HistorialTable historial={historial} />
    </div>
  );
}
