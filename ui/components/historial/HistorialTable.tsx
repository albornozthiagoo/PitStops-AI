"use client";

import { useState } from "react";
import { Badge, Button, Input, Panel } from "@/components/ui";
import { EstadoVehiculo } from "@/generated/prisma/browser";
import type { HistorialItem } from "@/lib/services/historial";

const BADGE_BY_ESTADO: Record<EstadoVehiculo, { status: "critica" | "media" | "baja"; label: string }> = {
  [EstadoVehiculo.DIAGNOSTICANDO]: { status: "critica", label: "En diagnóstico" },
  [EstadoVehiculo.EN_COLA]: { status: "media", label: "En cola" },
  [EstadoVehiculo.COMPLETADO]: { status: "baja", label: "Completado" },
};

function coincide(item: HistorialItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.patente.toLowerCase().includes(q) ||
    item.vin.toLowerCase().includes(q) ||
    item.modelo.toLowerCase().includes(q)
  );
}

export function HistorialTable({ historial }: { historial: HistorialItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");

  function aplicarFiltro() {
    setQuery(draft);
  }

  function limpiarFiltro() {
    setDraft("");
    setQuery("");
  }

  const visibles = historial.filter((item) => coincide(item, query));

  return (
    <>
      <div className="flex gap-2.5 mb-5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              aplicarFiltro();
            }
          }}
          placeholder="Buscar por patente, VIN o modelo…"
          className="max-w-[340px]"
        />
        <Button variant="secondary" onClick={aplicarFiltro}>
          Filtrar
        </Button>
        {query && (
          <Button variant="ghost" onClick={limpiarFiltro}>
            Limpiar
          </Button>
        )}
      </div>

      {query && (
        <p className="text-text-lo text-xs mb-3">
          {visibles.length === 0
            ? `Sin resultados para "${query}".`
            : `${visibles.length} de ${historial.length} vehículo(s) coinciden con "${query}".`}
        </p>
      )}

      <Panel>
        <div className="grid grid-cols-[110px_1.4fr_1fr_1fr_120px_40px] gap-3 px-4 py-3 text-text-lo font-mono text-[10px] tracking-wide uppercase border-b border-line">
          <div>Patente</div>
          <div>Vehículo</div>
          <div>Última visita</div>
          <div>Último síntoma</div>
          <div>Estado</div>
          <div />
        </div>

        {visibles.length === 0 ? (
          <p className="px-4 py-6 text-text-lo text-sm">
            {historial.length === 0 ? "Todavía no hay vehículos cargados." : "Ningún vehículo coincide con la búsqueda."}
          </p>
        ) : (
          visibles.map((item) => {
            const open = openId === item.vehiculoId;
            const badge = BADGE_BY_ESTADO[item.estado];
            return (
              <div key={item.vehiculoId}>
                <button
                  onClick={() => setOpenId(open ? null : item.vehiculoId)}
                  className="w-full grid grid-cols-[110px_1.4fr_1fr_1fr_120px_40px] gap-3 items-center px-4 py-[15px] border-b border-line-soft hover:bg-steel-800 transition-colors text-left"
                  aria-expanded={open}
                >
                  <div>
                    <span className="font-mono font-bold text-text-hi bg-graphite-950 border border-line px-1.5 py-0.5 clip-cut-sm text-xs inline-block">
                      {item.patente}
                    </span>
                  </div>
                  <div>{item.modelo}</div>
                  <div className="font-mono">{item.ultimaVisita}</div>
                  <div>{item.sintoma}</div>
                  <div>
                    <Badge status={badge.status}>{badge.label}</Badge>
                  </div>
                  <div className="font-mono text-text-lo">{open ? "▴" : "▾"}</div>
                </button>

                {open && (
                  <div className="px-4 pb-[18px] bg-graphite-950">
                    {item.ots.length === 0 ? (
                      <p className="text-text-lo text-xs py-2.5">Sin OTs registradas.</p>
                    ) : (
                      item.ots.map((ot) => (
                        <div
                          key={ot.id}
                          className="flex justify-between px-3.5 py-2.5 border border-line-soft mt-2 text-[12.5px]"
                        >
                          <span>
                            {ot.codigo} — {ot.descripcion}
                          </span>
                          <span className="font-mono text-text-lo">{ot.fecha}</span>
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
