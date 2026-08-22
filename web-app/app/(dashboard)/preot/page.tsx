import { getUltimoPreOt } from "@/lib/services/preot";
import { PreOtDocument } from "@/components/preot/PreOtDocument";

// Depende de la base en cada visita — nunca prerenderizar en build time.
export const dynamic = "force-dynamic";

export default async function PreOtPage() {
  const preOt = await getUltimoPreOt();

  if (!preOt) {
    return (
      <div className="h-full flex items-center justify-center p-7">
        <p className="text-text-lo">Todavía no se generó ninguna Pre-OT.</p>
      </div>
    );
  }

  const { vehiculo } = preOt;

  return (
    <div className="h-full overflow-auto p-7">
      <div className="font-mono text-[11px] tracking-[.14em] uppercase text-action-orange mb-1.5 flex items-center gap-2">
        <span className="w-3.5 h-px bg-action-orange" />
        Documento técnico
      </div>
      <h2 className="text-2xl mb-[18px]">Pre-Orden de Trabajo</h2>

      <PreOtDocument
        id={preOt.id}
        codigo={preOt.codigo}
        generada={preOt.generada.toLocaleString("es-AR")}
        aprobadaInicial={preOt.aprobada}
        prioridadInicial={preOt.prioridad}
        sintomaPrincipalInicial={preOt.sintomaPrincipal}
        tiempoEstimadoInicial={preOt.tiempoEstimado}
        vehiculo={{
          modelo: vehiculo.modelo,
          patente: vehiculo.patente,
          vin: vehiculo.vin,
          kilometraje: `${vehiculo.kilometraje.toLocaleString("es-AR")}`,
          bahia: vehiculo.bahia ?? "—",
        }}
        hipotesis={preOt.hipotesis.map((h) => ({
          id: h.id,
          nombre: h.nombre,
          probabilidad: h.probabilidad,
        }))}
        herramientasIniciales={preOt.herramientas.map((t) => ({ id: t.id, nombre: t.nombre }))}
      />
    </div>
  );
}
