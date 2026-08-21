import { prisma } from "@/lib/prisma";
import type { OrdenTrabajo, Vehiculo } from "@/generated/prisma/client";

export interface HistorialItem {
  vehiculo: Vehiculo;
  ultimaVisita: Date;
  ots: OrdenTrabajo[];
}

export async function getHistorial(): Promise<HistorialItem[]> {
  const vehiculos = await prisma.vehiculo.findMany({
    include: { ordenes: { orderBy: { fecha: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return vehiculos.map(({ ordenes, ...vehiculo }) => ({
    vehiculo,
    // Si todavía no tiene ninguna OT registrada, usamos la fecha de alta
    // del vehículo como referencia.
    ultimaVisita: ordenes[0]?.fecha ?? vehiculo.createdAt,
    ots: ordenes,
  }));
}
