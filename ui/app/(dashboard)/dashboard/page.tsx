import Link from "next/link";
import { Button, Panel } from "@/components/ui";
import { QueueRow } from "@/components/dashboard/QueueRow";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { vehiculos } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="h-full overflow-auto p-7">
      <div className="font-mono text-[11px] tracking-[.14em] uppercase text-action-orange mb-1.5 flex items-center gap-2">
        <span className="w-3.5 h-px bg-action-orange" />
        Centro de diagnóstico
      </div>

      <div className="flex justify-between items-end mb-[22px]">
        <h2 className="text-2xl">Dashboard del taller</h2>
        <Link href="/chat">
          <Button variant="primary">+ Nuevo diagnóstico</Button>
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Vehículos en diagnóstico"
          value="07"
          delta="▲ 2 desde ayer"
          deltaColor="green"
        />
        <KpiCard
          label="OTs pendientes"
          value="12"
          delta="4 esperan aprobación"
          deltaColor="yellow"
        />
        <KpiCard
          label="Tiempo prom. diagnóstico"
          value="6.4"
          unit="min"
          delta="▼ 1.1 min"
          deltaColor="green"
        />
        <KpiCard
          label="Alertas críticas"
          value="02"
          delta="Revisar bahía 2 y 6"
          deltaColor="red"
        />
      </div>

      <Panel>
        <div className="px-5 py-4 border-b border-line flex justify-between items-center">
          <h3 className="text-sm">Cola de vehículos</h3>
          <span className="font-mono text-[11px] text-text-lo">actualizado hace 12s</span>
        </div>

        <div className="grid grid-cols-[90px_1.3fr_1fr_0.8fr_0.8fr_100px] gap-3 px-4 py-2.5 text-text-lo font-mono text-[10px] tracking-wide uppercase border-b border-line">
          <div>Bahía</div>
          <div>Vehículo</div>
          <div>Síntoma</div>
          <div>Prioridad</div>
          <div>Estado</div>
          <div>OT</div>
        </div>

        {vehiculos.map((v) => (
          <QueueRow key={v.id} vehiculo={v} />
        ))}
      </Panel>
    </div>
  );
}
