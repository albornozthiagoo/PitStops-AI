import { Badge, Button, Panel } from "@/components/ui";
import { HypothesisRow } from "@/components/preot/HypothesisRow";
import { preOts, vehiculos } from "@/lib/mock-data";

export default function PreOtPage() {
  const preOt = preOts[0];
  const vehiculo = vehiculos.find((v) => v.id === preOt.vehiculoId)!;

  return (
    <div className="h-full overflow-auto p-7">
      <div className="font-mono text-[11px] tracking-[.14em] uppercase text-action-orange mb-1.5 flex items-center gap-2">
        <span className="w-3.5 h-px bg-action-orange" />
        Documento técnico
      </div>
      <h2 className="text-2xl mb-[18px]">Pre-Orden de Trabajo</h2>

      <Panel size="lg" className="max-w-[920px] mx-auto">
        <div className="flex justify-between items-start px-7 py-6 border-b border-line">
          <div>
            <h3 className="text-base">{vehiculo.modelo}</h3>
            <div className="font-mono text-xs text-text-lo">
              {preOt.id} · generada {preOt.generada}
            </div>
          </div>
          <Badge status={preOt.prioridad === "critica" ? "critica" : preOt.prioridad === "media" ? "media" : "baja"}>
            Prioridad {preOt.prioridad === "critica" ? "crítica" : preOt.prioridad === "media" ? "media" : "baja"}
          </Badge>
        </div>

        <div className="px-7 py-[22px] border-b border-line-soft grid grid-cols-4 gap-[18px]">
          <Field label="Patente" value={vehiculo.patente} />
          <Field label="VIN" value={vehiculo.vin} />
          <Field label="Kilometraje" value={`${vehiculo.kilometraje.toLocaleString("es-AR")} km`} />
          <Field label="Bahía" value={vehiculo.bahia} />
        </div>

        <div className="px-7 py-[22px] border-b border-line-soft">
          <span className="font-mono text-[10px] tracking-[.12em] uppercase text-titanium-300">
            Síntoma principal reportado
          </span>
          <p className="text-text-hi text-sm mt-1.5">{preOt.sintomaPrincipal}</p>
        </div>

        <div className="px-7 py-[22px] border-b border-line-soft">
          <span className="font-mono text-[10px] tracking-[.12em] uppercase text-titanium-300 mb-3 block">
            Hipótesis diagnósticas
          </span>
          {preOt.hipotesis.map((h) => (
            <HypothesisRow key={h.nombre} hipotesis={h} />
          ))}
        </div>

        <div className="px-7 py-[22px] border-b border-line-soft">
          <span className="font-mono text-[10px] tracking-[.12em] uppercase text-titanium-300 mb-2.5 block">
            Herramientas sugeridas
          </span>
          <div className="flex gap-2 flex-wrap">
            {preOt.herramientas.map((t) => (
              <span
                key={t}
                className="font-mono text-[11.5px] text-text-md bg-steel-800 border border-line px-2.5 py-1.5 clip-badge"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="px-7 py-[22px] flex justify-between items-center">
          <div>
            <span className="font-mono text-[10px] tracking-[.12em] uppercase text-titanium-300 block">
              Tiempo estimado
            </span>
            <div className="font-mono text-base text-text-hi mt-1">{preOt.tiempoEstimado}</div>
          </div>
          <div className="flex gap-2.5">
            <Button variant="ghost">Editar</Button>
            <Button variant="primary">Aprobar y enviar a taller</Button>
          </div>
        </div>
      </Panel>
    </div>
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
