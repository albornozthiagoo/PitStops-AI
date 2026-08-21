import { Panel } from "@/components/ui";
import { QueueRow } from "@/components/dashboard/QueueRow";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { getDashboardData } from "@/lib/services/dashboard";

// Depende de la base en cada visita — nunca prerenderizar en build time.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { cola, stats } = await getDashboardData();

  return (
    <div className="h-full overflow-auto p-7">
      <div className="font-mono text-[11px] tracking-[.14em] uppercase text-action-orange mb-1.5 flex items-center gap-2">
        <span className="w-3.5 h-px bg-action-orange" />
        Centro de diagnóstico
      </div>

      <div className="mb-[22px]">
        <h2 className="text-2xl">Dashboard del taller</h2>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Vehículos en diagnóstico"
          value={String(stats.enDiagnostico).padStart(2, "0")}
          delta={`${stats.enCola} en cola`}
          deltaColor="yellow"
        />
        <KpiCard
          label="OTs sin aprobar"
          value={String(stats.otsPendientes).padStart(2, "0")}
          delta={`${stats.totalPreOts} generadas en total`}
          deltaColor="yellow"
        />
        <KpiCard
          label="Conversaciones activas"
          value={String(stats.conversacionesActivas).padStart(2, "0")}
          delta={`${stats.totalConversaciones} en total`}
          deltaColor="green"
        />
        <KpiCard
          label="Alertas críticas"
          value={String(stats.criticos).padStart(2, "0")}
          delta={
            stats.bahiasCriticas.length
              ? `Revisar bahía ${stats.bahiasCriticas.join(", ")}`
              : "Sin alertas"
          }
          deltaColor="red"
        />
      </div>

      <Panel>
        <div className="px-5 py-4 border-b border-line flex justify-between items-center">
          <h3 className="text-sm">Cola de vehículos</h3>
        </div>

        <div className="grid grid-cols-[90px_1.3fr_1fr_0.8fr_0.8fr_100px] gap-3 px-4 py-2.5 text-text-lo font-mono text-[10px] tracking-wide uppercase border-b border-line">
          <div>Bahía</div>
          <div>Vehículo</div>
          <div>Síntoma</div>
          <div>Prioridad</div>
          <div>Estado</div>
          <div>OT</div>
        </div>

        {cola.length === 0 ? (
          <p className="px-4 py-6 text-text-lo text-sm">No hay vehículos en cola.</p>
        ) : (
          cola.map((v) => <QueueRow key={v.id} vehiculo={v} />)
        )}
      </Panel>
    </div>
  );
}
