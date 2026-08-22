import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// En dev, Next.js recarga módulos en cada cambio de archivo. Sin este patrón,
// cada recarga crea un PrismaClient nuevo y termina agotando las conexiones
// a la base. Guardamos la instancia en globalThis para reusarla.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma 7 sacó el motor en Rust: ahora Prisma Client usa directamente el
// driver `pg` (node-postgres) por debajo, el mismo que usa `psql`. Esto es
// justo lo que resuelve el problema de conexión que tuvimos con el binario
// del motor viejo fallando contra el pooler de Supabase.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  // Ver nota de SSL en el README: Supabase requiere SSL y el driver `pg`
  // no lo asume por default como sí lo hacía el motor en Rust.
  ssl: { rejectUnauthorized: false },
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
