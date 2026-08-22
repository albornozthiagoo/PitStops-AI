import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPreOtPorVehiculo } from "@/lib/services/preot";
import { PreOtDocument } from "@/components/preot/PreOtDocument";

// Depende de la base en cada visita — nunca prerenderizar en build time.
export const dynamic = "force-dynamic";

interface Props {
  // Next.js 15+ pasa `params` como Promise en las páginas.
  params: Promise<{ vehiculoId: string }>;
}

export default async function PreOtPorVehiculoPage({ params }: Props) {
  const { vehiculoId } = await params;

  const vehiculo = await prisma.vehiculo.findUnique({
    where: { id: vehiculoId },
    select: { id: true, modelo: true, patente: true },
  });

  if (!vehiculo) {
    return (
      <div className="h-full flex items-center justify-center p-7">
        <p className="text-text-lo">No se encontró ese vehículo.</p>
      </div>
    );
  }

  const preOt = await getPreOtPorVehiculo(vehiculoId);

  if (!preOt) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 p-7 text-center">
        <p className="text-text-hi">
          {vehiculo.modelo} <span className="font-mono text-text-lo">({vehiculo.patente})</span> todavía no tiene
          una Pre-OT generada.
        </p>
        <p className="text-text-lo text-sm">
          Se genera automáticamente cuando el motor de diagnóstico (IA) termina de conversar con el cliente por
          WhatsApp.
        </p>
        <Link href="/dashboard" className="text-action-orange text-sm mt-2 hover:underline">
          Volver al dashboard
        </Link>
      </div>
    );
  }

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
          modelo: preOt.vehiculo.modelo,
          patente: preOt.vehiculo.patente,
          vin: preOt.vehiculo.vin,
          kilometraje: `${preOt.vehiculo.kilometraje.toLocaleString("es-AR")}`,
          bahia: preOt.vehiculo.bahia ?? "—",
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
