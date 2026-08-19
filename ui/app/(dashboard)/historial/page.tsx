"use client";

import { useState } from "react";
import { Badge, Button, Input, Panel } from "@/components/ui";
import { historial } from "@/lib/mock-data";
import type { EstadoVehiculo } from "@/lib/types";

const BADGE_BY_ESTADO: Record<EstadoVehiculo, { status: "critica" | "media" | "baja"; label: string }> = {
  diagnosticando: { status: "critica", label: "En diagnóstico" },
  en_cola: { status: "media", label: "En cola" },
  completado: { status: "baja", label: "Completado" },
};

export default function HistorialPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="h-full overflow-auto p-7">
      <div className="font-mono text-[11px] tracking-[.14em] uppercase text-action-orange mb-1.5 flex items-center gap-2">
        <span className="w-3.5 h-px bg-action-orange" />
        Registro de unidades
      </div>
      <h2 className="text-2xl mb-[18px]">Historial de vehículos</h2>

      <div className="flex gap-2.5 mb-5">
        <Input placeholder="Buscar por patente, VIN o modelo…" className="max-w-[340px]" />
        <Button variant="secondary">Filtrar</Button>
      </div>

      <Panel>
        <div className="grid grid-cols-[110px_1.4fr_1fr_1fr_120px_40px] gap-3 px-4 py-3 text-text-lo font-mono text-[10px] tracking-wide uppercase border-b border-line">
          <div>Patente</div>
          <div>Vehículo</div>
          <div>Última visita</div>
          <div>Último síntoma</div>
          <div>Estado</div>
          <div />
        </div>

        {historial.map(({ vehiculo, ultimaVisita, ots }) => {
          const open = openId === vehiculo.id;
          const badge = BADGE_BY_ESTADO[vehiculo.estado];
          return (
            <div key={vehiculo.id}>
              <button
                onClick={() => setOpenId(open ? null : vehiculo.id)}
                className="w-full grid grid-cols-[110px_1.4fr_1fr_1fr_120px_40px] gap-3 items-center px-4 py-[15px] border-b border-line-soft hover:bg-steel-800 transition-colors text-left"
                aria-expanded={open}
              >
                <div>
                  <span className="font-mono font-bold text-text-hi bg-graphite-950 border border-line px-1.5 py-0.5 clip-cut-sm text-xs inline-block">
                    {vehiculo.patente}
                  </span>
                </div>
                <div>{vehiculo.modelo}</div>
                <div className="font-mono">{ultimaVisita}</div>
                <div>{vehiculo.sintoma}</div>
                <div>
                  <Badge status={badge.status}>{badge.label}</Badge>
                </div>
                <div className="font-mono text-text-lo">{open ? "▴" : "▾"}</div>
              </button>

              {open && (
                <div className="px-4 pb-[18px] bg-graphite-950">
                  {ots.map((ot) => (
                    <div
                      key={ot.id}
                      className="flex justify-between px-3.5 py-2.5 border border-line-soft mt-2 text-[12.5px]"
                    >
                      <span>
                        {ot.id} — {ot.descripcion}
                      </span>
                      <span className="font-mono text-text-lo">{ot.fecha}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Panel>
    </div>
  );
}
