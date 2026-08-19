import { PrismaClient } from "@prisma/client";

// En dev, Next.js recarga módulos en cada cambio de archivo. Sin este patrón,
// cada recarga crea un PrismaClient nuevo y termina agotando las conexiones
// a la base. Guardamos la instancia en globalThis para reusarla.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
