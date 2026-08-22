import { prisma } from "@/lib/prisma";

export async function getUltimoPreOt() {
  return prisma.preOT.findFirst({
    orderBy: { generada: "desc" },
    include: { hipotesis: true, herramientas: true, vehiculo: true },
  });
}

// La Pre-OT más reciente de UN vehículo puntual — la usa /preot/[vehiculoId],
// que es a donde apunta el botón "Ver diagnóstico" de cada fila del
// dashboard (antes apuntaba siempre a /preot a secas, que mostraba la
// última Pre-OT de todo el sistema sin importar qué auto tocaste).
export async function getPreOtPorVehiculo(vehiculoId: string) {
  return prisma.preOT.findFirst({
    where: { vehiculoId },
    orderBy: { generada: "desc" },
    include: { hipotesis: true, herramientas: true, vehiculo: true },
  });
}
