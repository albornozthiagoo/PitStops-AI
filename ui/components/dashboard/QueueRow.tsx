import Link from "next/link";
import { Badge, Button, Led } from "@/components/ui";
import type { Vehiculo } from "@/lib/types";

const ESTADO_META: Record<
  Vehiculo["estado"],
  { led: "green" | "orange" | "red"; label: string }
> = {
  diagnosticando: { led: "red", label: "Diagnosticando" },
  en_cola: { led: "orange", label: "En cola" },
  completado: { led: "green", label: "Completado" },
};

export function QueueRow({ vehiculo }: { vehiculo: Vehiculo }) {
  const estado = ESTADO_META[vehiculo.estado];
  const accion =
    vehiculo.estado === "completado"
      ? { href: "/historial", label: "Historial" }
      : { href: "/preot", label: "Ver diagnóstico" };

  return (
    <div className="grid grid-cols-[90px_1.3fr_1fr_0.8fr_0.8fr_100px] gap-3 items-center px-4 py-3.5 border-b border-line-soft hover:bg-steel-800 transition-colors">
      <div>
        <span className="font-mono font-bold text-text-hi bg-graphite-950 border border-line px-1.5 py-0.5 clip-cut-sm text-xs inline-block">
          {vehiculo.bahia}
        </span>
      </div>
      <div>
        {vehiculo.modelo}
        <div className="font-mono text-[11px] text-text-lo">{vehiculo.patente}</div>
      </div>
      <div>{vehiculo.sintoma}</div>
      <div>
        <Badge status={vehiculo.prioridad === "critica" ? "critica" : vehiculo.prioridad === "media" ? "media" : "baja"} />
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
