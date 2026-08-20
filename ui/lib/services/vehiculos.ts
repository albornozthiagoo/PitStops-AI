import { prisma } from "@/lib/prisma";
import type { Vehiculo, Prioridad, EstadoVehiculo } from "@/generated/prisma/client";

// Server-only: este archivo asume que corre dentro de un Server Component
// o Route Handler. Nunca se importa desde un componente "use client".

export async function getVehiculos(): Promise<Vehiculo[]> {
  try {
    return await prisma.vehiculo.findMany({
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    // Logueá el error real ANTES de decidir qué hacer con él — así en los
    // logs de Vercel/servidor ves la causa concreta (conexión caída,
    // credencial mala, tabla inexistente) en vez de un mensaje genérico.
    console.error("[getVehiculos] Error consultando la base:", error);

    // Re-lanzamos con un mensaje claro para el usuario, pero conservamos
    // la causa original (`cause`) para no perderla en el boundary de error.
    throw new Error("No se pudieron cargar los vehículos", { cause: error });
  }
}

export async function getVehiculoByPatente(patente: string) {
  return prisma.vehiculo.findUnique({
    where: { patente },
    include: {
      cliente: true,
      conversaciones: { include: { mensajes: true } },
      preOts: { include: { hipotesis: true, herramientas: true } },
      ordenes: true,
    },
  });
}
