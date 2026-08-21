"use client";

import { useState } from "react";
import { Badge, Button, Input, Panel } from "@/components/ui";
import { EstadoVehiculo } from "@/generated/prisma/client";
import type { HistorialItem } from "@/lib/services/historial";

const BADGE_BY_ESTADO: Record<EstadoVehiculo, { status: "critica" | "media" | "baja"; label: string }> = {
  [EstadoVehiculo.DIAGNOSTICANDO]: { status: "critica", label: "En diagnóstico" },
  [EstadoVehiculo.EN_COLA]: { status: "media", label: "En cola" },
  [EstadoVehiculo.COMPLETADO]: { status: "baja", label: "Completado" },
};

export function HistorialTable({ historial }: { historial: HistorialItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
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

        {historial.length === 0 ? (
          <p className="px-4 py-6 text-text-lo text-sm">Todavía no hay vehículos cargados.</p>
        ) : (
          historial.map(({ vehiculo, ultimaVisita, ots }) => {
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
                  <div className="font-mono">{ultimaVisita.toLocaleDateString("es-AR")}</div>
                  <div>{vehiculo.sintoma}</div>
                  <div>
                    <Badge status={badge.status}>{badge.label}</Badge>
                  </div>
                  <div className="font-mono text-text-lo">{open ? "▴" : "▾"}</div>
                </button>

                {open && (
                  <div className="px-4 pb-[18px] bg-graphite-950">
                    {ots.length === 0 ? (
                      <p className="text-text-lo text-xs py-2.5">Sin OTs registradas.</p>
                    ) : (
                      ots.map((ot) => (
                        <div
                          key={ot.id}
                          className="flex justify-between px-3.5 py-2.5 border border-line-soft mt-2 text-[12.5px]"
                        >
                          <span>
                            {ot.codigo} — {ot.descripcion}
                          </span>
                          <span className="font-mono text-text-lo">
                            {ot.fecha.toLocaleDateString("es-AR")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </Panel>
    </>
  );
}
