"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Panel, ProbBar } from "@/components/ui";
import { cn } from "@/lib/cn";

// Nota: usamos literales de string para la prioridad ("CRITICA" | "MEDIA" |
// "BAJA") en vez de importar el enum Prioridad desde @/generated/prisma —
// este es un componente "use client" y ese módulo (incluso la variante
// browser.ts) no hace falta acá: los valores ya llegan como texto plano
// desde el Server Component.
const PRIORIDAD_LABEL: Record<string, string> = {
  CRITICA: "crítica",
  MEDIA: "media",
  BAJA: "baja",
};

const PRIORIDAD_STATUS: Record<string, "critica" | "media" | "baja"> = {
  CRITICA: "critica",
  MEDIA: "media",
  BAJA: "baja",
};

export interface PreOtDocumentHipotesis {
  id: string;
  nombre: string;
  probabilidad: number;
}

export interface PreOtDocumentHerramienta {
  id: string;
  nombre: string;
}

export interface PreOtDocumentVehiculo {
  modelo: string;
  patente: string;
  vin: string;
  kilometraje: string;
  bahia: string;
}

interface Props {
  id: string;
  codigo: string;
  generada: string;
  aprobadaInicial: boolean;
  prioridadInicial: string;
  sintomaPrincipalInicial: string;
  tiempoEstimadoInicial: string;
  vehiculo: PreOtDocumentVehiculo;
  hipotesis: PreOtDocumentHipotesis[];
  herramientasIniciales: PreOtDocumentHerramienta[];
}

export function PreOtDocument({
  id,
  codigo,
  generada,
  aprobadaInicial,
  prioridadInicial,
  sintomaPrincipalInicial,
  tiempoEstimadoInicial,
  vehiculo,
  hipotesis,
  herramientasIniciales,
}: Props) {
  const router = useRouter();

  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aprobando, setAprobando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [aprobada, setAprobada] = useState(aprobadaInicial);
  const [prioridad, setPrioridad] = useState(prioridadInicial);
  const [sintomaPrincipal, setSintomaPrincipal] = useState(sintomaPrincipalInicial);
  const [tiempoEstimado, setTiempoEstimado] = useState(tiempoEstimadoInicial);
  const [herramientasTexto, setHerramientasTexto] = useState(
    herramientasIniciales.map((h) => h.nombre).join(", ")
  );
  const [herramientas, setHerramientas] = useState(herramientasIniciales);

  function cancelarEdicion() {
    setPrioridad(prioridadInicial);
    setSintomaPrincipal(sintomaPrincipalInicial);
    setTiempoEstimado(tiempoEstimadoInicial);
    setHerramientasTexto(herramientasIniciales.map((h) => h.nombre).join(", "));
    setError(null);
    setEditando(false);
  }

  async function guardarCambios() {
    setGuardando(true);
    setError(null);
    try {
      const nuevasHerramientas = herramientasTexto
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);

      const res = await fetch(`/api/preot/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sintomaPrincipal,
          tiempoEstimado,
          prioridad,
          herramientas: nuevasHerramientas,
        }),
      });
      if (!res.ok) throw new Error("No se pudo guardar");
      const data = await res.json();

      setHerramientas(data.herramientas ?? []);
      setHerramientasTexto((data.herramientas ?? []).map((h: { nombre: string }) => h.nombre).join(", "));
      setEditando(false);
      router.refresh();
    } catch {
      setError("No se pudieron guardar los cambios. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function aprobar() {
    setAprobando(true);
    setError(null);
    try {
      const ordenCodigo = `OT #${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetch(`/api/preot/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "aprobar",
          ordenCodigo,
          descripcion: sintomaPrincipal,
        }),
      });
      if (!res.ok) throw new Error("No se pudo aprobar");

      setAprobada(true);
      setAviso(`Aprobada — se generó la orden de trabajo ${ordenCodigo} y el vehículo pasó a la cola del taller.`);
      router.refresh();
    } catch {
      setError("No se pudo aprobar la Pre-OT. Probá de nuevo.");
    } finally {
      setAprobando(false);
    }
  }

  return (
    <Panel size="lg" className="max-w-[920px] mx-auto">
      <div className="flex justify-between items-start px-7 py-6 border-b border-line">
        <div>
          <h3 className="text-base">{vehiculo.modelo}</h3>
          <div className="font-mono text-xs text-text-lo">
            {codigo} · generada {generada}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {aprobada && <Badge status="baja">Aprobada</Badge>}
          {editando ? (
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="bg-graphite-950 border border-line text-text-hi text-xs px-2.5 py-1.5 clip-cut-sm focus:border-action-orange focus:outline-none"
            >
              <option value="CRITICA">Prioridad crítica</option>
              <option value="MEDIA">Prioridad media</option>
              <option value="BAJA">Prioridad baja</option>
            </select>
          ) : (
            <Badge status={PRIORIDAD_STATUS[prioridad] ?? "media"}>
              Prioridad {PRIORIDAD_LABEL[prioridad] ?? prioridad.toLowerCase()}
            </Badge>
          )}
        </div>
      </div>

      <div className="px-7 py-[22px] border-b border-line-soft grid grid-cols-4 gap-[18px]">
        <Field label="Patente" value={vehiculo.patente} />
        <Field label="VIN" value={vehiculo.vin} />
        <Field label="Kilometraje" value={`${vehiculo.kilometraje} km`} />
        <Field label="Bahía" value={vehiculo.bahia} />
      </div>

      <div className="px-7 py-[22px] border-b border-line-soft">
        <span className="font-mono text-[10px] tracking-[.12em] uppercase text-titanium-300">
          Síntoma principal reportado
        </span>
        {editando ? (
          <textarea
            value={sintomaPrincipal}
            onChange={(e) => setSintomaPrincipal(e.target.value)}
            rows={2}
            className="w-full mt-1.5 bg-graphite-950 border border-line text-text-hi px-3 py-2.5 text-sm clip-cut-sm focus:border-action-orange focus:outline-none resize-none"
          />
        ) : (
          <p className="text-text-hi text-sm mt-1.5">{sintomaPrincipal}</p>
        )}
      </div>

      <div className="px-7 py-[22px] border-b border-line-soft">
        <span className="font-mono text-[10px] tracking-[.12em] uppercase text-titanium-300 mb-3 block">
          Hipótesis diagnósticas
        </span>
        {hipotesis.map((h) => (
          <div key={h.id} className="flex items-center gap-3.5 py-3 border-b border-line-soft last:border-b-0">
            <div className="w-[220px] flex-none text-text-hi font-medium">{h.nombre}</div>
            <div className="flex-1">
              <ProbBar pct={h.probabilidad} />
            </div>
            <div className="w-11 flex-none font-mono text-action-orange text-right text-xs">
              {h.probabilidad}%
            </div>
          </div>
        ))}
      </div>

      <div className="px-7 py-[22px] border-b border-line-soft">
        <span className="font-mono text-[10px] tracking-[.12em] uppercase text-titanium-300 mb-2.5 block">
          Herramientas sugeridas
        </span>
        {editando ? (
          <input
            value={herramientasTexto}
            onChange={(e) => setHerramientasTexto(e.target.value)}
            placeholder="Separadas por coma: llave 14mm, escáner OBD-II…"
            className="w-full bg-graphite-950 border border-line text-text-hi px-3 py-[11px] text-sm clip-cut-sm placeholder:text-text-lo focus:border-action-orange focus:outline-none"
          />
        ) : (
          <div className="flex gap-2 flex-wrap">
            {herramientas.length === 0 ? (
              <span className="text-text-lo text-xs">Sin herramientas sugeridas.</span>
            ) : (
              herramientas.map((t) => (
                <span
                  key={t.id}
                  className="font-mono text-[11.5px] text-text-md bg-steel-800 border border-line px-2.5 py-1.5 clip-badge"
                >
                  {t.nombre}
                </span>
              ))
            )}
          </div>
        )}
      </div>

      <div className="px-7 py-[22px]">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-mono text-[10px] tracking-[.12em] uppercase text-titanium-300 block">
              Tiempo estimado
            </span>
            {editando ? (
              <input
                value={tiempoEstimado}
                onChange={(e) => setTiempoEstimado(e.target.value)}
                className="mt-1 bg-graphite-950 border border-line text-text-hi px-3 py-2 text-sm clip-cut-sm focus:border-action-orange focus:outline-none w-40"
              />
            ) : (
              <div className="font-mono text-base text-text-hi mt-1">{tiempoEstimado}</div>
            )}
          </div>

          <div className="flex gap-2.5">
            {aprobada ? null : editando ? (
              <>
                <Button variant="ghost" onClick={cancelarEdicion} disabled={guardando}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={guardarCambios} disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar cambios"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setEditando(true)}>
                  Editar
                </Button>
                <Button variant="primary" onClick={aprobar} disabled={aprobando}>
                  {aprobando ? "Aprobando…" : "Aprobar y enviar a taller"}
                </Button>
              </>
            )}
          </div>
        </div>

        {error && <p className={cn("text-[#ff8a85] text-xs mt-3")}>{error}</p>}
        {aviso && !error && <p className="text-[#7ee8ac] text-xs mt-3">{aviso}</p>}
      </div>
    </Panel>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-[10px] tracking-[.12em] uppercase text-titanium-300 mb-1 block">
        {label}
      </span>
      <div className="font-mono text-text-hi text-[13.5px]">{value}</div>
    </div>
  );
}
