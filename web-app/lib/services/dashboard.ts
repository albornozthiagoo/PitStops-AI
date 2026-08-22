import { prisma } from "@/lib/prisma";
import { EstadoVehiculo, Prioridad, type Vehiculo } from "@/generated/prisma/client";

export interface DashboardStats {
  enDiagnostico: number;
  enCola: number;
  criticos: number;
  bahiasCriticas: string[];
  otsPendientes: number;
  totalPreOts: number;
  conversacionesActivas: number;
  totalConversaciones: number;
}

export interface DashboardData {
  cola: Vehiculo[];
  stats: DashboardStats;
}

export async function getDashboardData(): Promise<DashboardData> {
  const [vehiculos, preOts, conversaciones] = await Promise.all([
    prisma.vehiculo.findMany({
      where: { estado: { not: EstadoVehiculo.COMPLETADO } },
      orderBy: [{ prioridad: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.preOT.findMany({ select: { aprobada: true } }),
    prisma.conversacion.findMany({ select: { estado: true } }),
  ]);

  const criticos = vehiculos.filter((v) => v.prioridad === Prioridad.CRITICA);

  return {
    cola: vehiculos,
    stats: {
      enDiagnostico: vehiculos.filter((v) => v.estado === EstadoVehiculo.DIAGNOSTICANDO).length,
      enCola: vehiculos.filter((v) => v.estado === EstadoVehiculo.EN_COLA).length,
      criticos: criticos.length,
      bahiasCriticas: criticos.map((v) => v.bahia).filter((b): b is string => Boolean(b)),
      otsPendientes: preOts.filter((p) => !p.aprobada).length,
      totalPreOts: preOts.length,
      conversacionesActivas: conversaciones.filter((c) => c.estado !== EstadoVehiculo.COMPLETADO).length,
      totalConversaciones: conversaciones.length,
    },
  };
}
