import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 dejó de leer .env automáticamente y de tomar la URL de conexión
// desde schema.prisma — todo lo que antes usaba `directUrl` para migrar
// ahora se configura acá.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // El CLI (migrate, studio, db seed) usa esta URL. Usamos DIRECT_URL
    // (session pooler, puerto 5432) porque soporta prepared statements —
    // el transaction pooler (6543) que usa la app en runtime no los soporta.
    url: env("DIRECT_URL"),
  },
});
