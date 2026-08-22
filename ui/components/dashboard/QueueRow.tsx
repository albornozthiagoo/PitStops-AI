import Link from "next/link";
import { Badge, Button, Led } from "@/components/ui";
import { EstadoVehiculo, Prioridad, type Vehiculo } from "@/generated/prisma/browser";

const ESTADO_META: Record<EstadoVehiculo, { led: "green" | "orange" | "red"; label: string }> = {
  [EstadoVehiculo.DIAGNOSTICANDO]: { led: "red", label: "Diagnosticando" },
  [EstadoVehiculo.EN_COLA]: { led: "orange", label: "En cola" },
  [EstadoVehiculo.COMPLETADO]: { led: "green", label: "Completado" },
};

const PRIORIDAD_STATUS: Record<Prioridad, "critica" | "media" | "baja"> = {
  [Prioridad.CRITICA]: "critica",
  [Prioridad.MEDIA]: "media",
  [Prioridad.BAJA]: "baja",
};

export function QueueRow({ vehiculo }: { vehiculo: Vehiculo }) {
  const estado = ESTADO_META[vehiculo.estado];
  const accion =
    vehiculo.estado === EstadoVehiculo.COMPLETADO
      ? { href: "/historial", label: "Historial" }
      : { href: `/preot/${vehiculo.id}`, label: "Ver diagnóstico" };

  return (
    <div className="grid grid-cols-[90px_1.3fr_1fr_0.8fr_0.8fr_100px] gap-3 items-center px-4 py-3.5 border-b border-line-soft hover:bg-steel-800 transition-colors">
      <div>
        <span className="font-mono font-bold text-text-hi bg-graphite-950 border border-line px-1.5 py-0.5 clip-cut-sm text-xs inline-block">
          {vehiculo.bahia ?? "—"}
        </span>
      </div>
      <div>
        {vehiculo.modelo}
        <div className="font-mono text-[11px] text-text-lo">{vehiculo.patente}</div>
      </div>
      <div>{vehiculo.sintoma}</div>
      <div>
        <Badge status={PRIORIDAD_STATUS[vehiculo.prioridad]} />
      </div>
      <div className="flex items-center gap-1.5">
        <Led color={estado.led} />
        {estado.label}
      </div>
      <div>
        <Link href={accion.href}>
          <Button variant="ghost" size="sm">
            {accion.label}
          </Button>
        </Link>
      </div>
    </div>
  );
}
