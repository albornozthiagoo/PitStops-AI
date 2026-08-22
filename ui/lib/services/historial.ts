import { prisma } from "@/lib/prisma";
import type { EstadoVehiculo } from "@/generated/prisma/client";

// Shape "plano" y ya serializado, pensado para cruzar de Server Component a
// Client Component sin problemas: nada de objetos Date ni el registro
// completo de Prisma (que trae createdAt/updatedAt como Date) — Turbopack
// tiene bugs conocidos serializando Date en ese cruce, así que las
// formateamos acá mismo, en el servidor.
export interface HistorialOt {
  id: string;
  codigo: string;
  descripcion: string;
  fecha: string;
}

export interface HistorialItem {
  vehiculoId: string;
  patente: string;
  vin: string;
  modelo: string;
  sintoma: string;
  estado: EstadoVehiculo;
  ultimaVisita: string;
  ots: HistorialOt[];
}

export async function getHistorial(): Promise<HistorialItem[]> {
  const vehiculos = await prisma.vehiculo.findMany({
    include: { ordenes: { orderBy: { fecha: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return vehiculos.map((vehiculo) => {
    // Si todavía no tiene ninguna OT registrada, usamos la fecha de alta
    // del vehículo como referencia.
    const ultimaFecha = vehiculo.ordenes[0]?.fecha ?? vehiculo.createdAt;

    return {
      vehiculoId: vehiculo.id,
      patente: vehiculo.patente,
      vin: vehiculo.vin,
      modelo: vehiculo.modelo,
      sintoma: vehiculo.sintoma,
      estado: vehiculo.estado,
      ultimaVisita: ultimaFecha.toLocaleDateString("es-AR"),
      ots: vehiculo.ordenes.map((ot) => ({
        id: ot.id,
        codigo: ot.codigo,
        descripcion: ot.descripcion,
        fecha: ot.fecha.toLocaleDateString("es-AR"),
      })),
    };
  });
}
