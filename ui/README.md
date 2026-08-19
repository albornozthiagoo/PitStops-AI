# PitStop AI

Interfaz de prediagnóstico inteligente para talleres mecánicos.
Migración del prototipo HTML a **Next.js 14 (App Router) + React + TypeScript + Tailwind CSS**.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrí http://localhost:3000 — te redirige a `/login`. Cualquier usuario/contraseña entra
(la autenticación todavía es un stub, ver más abajo).

## Estructura

```
app/
  login/page.tsx                 Pantalla de login (standalone, sin sidebar)
  (dashboard)/layout.tsx         Sidebar + Topbar compartidos
  (dashboard)/dashboard/page.tsx Dashboard del taller
  (dashboard)/chat/page.tsx      Chat de prediagnóstico
  (dashboard)/preot/page.tsx     Pre-OT (documento técnico)
  (dashboard)/historial/page.tsx Historial de vehículos
  globals.css                    Reset, utilidades de recorte diagonal, textura hex

components/
  ui/            Panel, Button, Badge, Led, ScanLine/ScanBar/ProbBar, HexLogo, Input
  layout/        Sidebar, Topbar
  dashboard/     KpiCard, QueueRow
  chat/          ChatBubble, ThinkingIndicator
  preot/         HypothesisRow

lib/
  types.ts       Tipos compartidos (Vehiculo, Conversacion, PreOT, etc.)
  mock-data.ts   Datos de ejemplo — reemplazar por llamadas a la API
  cn.ts          Helper mínimo de clases condicionales
  prisma.ts      Singleton de PrismaClient (evita agotar conexiones en dev)
  services/
    vehiculos.ts Consulta la base directo con Prisma — sin fetch a un backend aparte

prisma/
  schema.prisma  Modelo de datos real (Postgres) — mapea 1:1 con lib/types.ts
  seed.ts        Carga los mismos datos de mock-data.ts en la base

app/vehiculos/
  page.tsx       Ejemplo de Server Component leyendo de Prisma vía el service
  error.tsx      Error boundary de esa ruta, con el mismo lenguaje visual
  loading.tsx    Estado de carga mientras se abre la conexión a la base
```

Todo el sistema de diseño (colores, tipografías, sombras, animaciones) vive en
`tailwind.config.ts`. Ningún componente usa hex sueltos.

## Base de datos (Prisma + Postgres)

1. Conseguí una base Postgres. Lo más rápido sin instalar nada local: creá un
   proyecto gratis en [Supabase](https://supabase.com) o [Neon](https://neon.tech)
   y copiá el connection string.
2. `cp .env.example .env` y pegá tu `DATABASE_URL` ahí.
3. Corré las migraciones y generá el cliente:
   ```bash
   npm run db:migrate
   ```
   Esto crea las tablas en tu Postgres según `prisma/schema.prisma` y genera
   `@prisma/client` con tipos TypeScript para cada modelo.
4. Cargá los datos de ejemplo (los mismos que hoy están en `lib/mock-data.ts`):
   ```bash
   npm run db:seed
   ```
5. Para inspeccionar la base con una UI:
   ```bash
   npm run db:studio
   ```

> **Nota sobre este entorno de generación**: no pude correr
> `npx prisma validate` / `npx prisma generate` acá porque el sandbox bloquea
> la salida de red a `binaries.prisma.sh` (el CDN donde Prisma descarga sus
> engines). Revisé el schema a mano — todas las relaciones están emparejadas
> correctamente (incluidas las 1-a-1 con `@unique` en la FK y las relaciones
> nombradas como `"AprobadaPor"`) — pero corré `npm run db:migrate` en tu
> máquina como primer chequeo real antes de darlo por bueno.
>
> Por el mismo motivo, `tsc --noEmit` marca errores en `lib/services/vehiculos.ts`
> y `prisma/seed.ts` diciendo que `@prisma/client` "no exported member Vehiculo/Prioridad/...".
> Es esperado: esos tipos los genera `prisma generate` a partir de tu schema, y
> ese paso no corrió acá. Desaparecen solos en cuanto ejecutes `npm run db:migrate`
> con internet normal.



## Próximos pasos para que sea funcional de verdad

1. **Autenticación real**: reemplazar el `router.push("/dashboard")` de
   `app/login/page.tsx` por NextAuth.js, Clerk o el proveedor que usen —
   ya hay `passwordHash` en el modelo `Tecnico` esperando un hash real (bcrypt/argon2).
2. ~~Base de datos~~ ✅ ya está en `prisma/schema.prisma`, ver sección de arriba.
3. ~~API routes~~ ✅ ver tabla de endpoints más abajo.
4. **Conectar el frontend a estos endpoints**: hoy `app/(dashboard)/*` todavía lee
   de `lib/mock-data.ts`. Reemplazar esos imports por `fetch()` a los endpoints
   de abajo (o Server Components que llamen a `lib/services/*` directo, como
   ya hace `app/vehiculos/page.tsx`).
5. **Motor de diagnóstico**: conectar el envío de mensajes en `app/(dashboard)/chat/page.tsx`
   a una API route que llame a un LLM, devuelva JSON estructurado
   (`{ hipotesis: [{nombre, probabilidad}], herramientas: [...], tiempoEstimado }`),
   y con eso llame a `POST /api/preot` para persistirlo.
6. **Accesibilidad**: agregar `aria-live="polite"` en el log de chat cuando lleguen
   mensajes nuevos del sistema (el `ThinkingIndicator` ya tiene `role="status"`).
7. **Deploy**: Vercel es la opción más directa para Next.js.

## API routes disponibles

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/vehiculos?estado=&tallerId=` | Lista vehículos, filtrable |
| `POST` | `/api/vehiculos` | Da de alta un vehículo nuevo |
| `GET` | `/api/vehiculos/:id` | Ficha completa (cliente, conversaciones, Pre-OTs, historial) |
| `PATCH` | `/api/vehiculos/:id` | Actualiza estado, prioridad, bahía, síntoma o km |
| `GET` | `/api/conversaciones?vehiculoId=` | Lista conversaciones con sus mensajes |
| `POST` | `/api/conversaciones` | Abre un chat nuevo con el primer mensaje del técnico |
| `POST` | `/api/conversaciones/:id/mensajes` | Agrega un mensaje del técnico a una conversación existente |
| `GET` | `/api/preot?vehiculoId=` | Lista Pre-OTs |
| `POST` | `/api/preot` | Genera una Pre-OT (hipótesis + herramientas ya calculadas) |
| `GET` | `/api/preot/:id` | Detalle de una Pre-OT |
| `PATCH` | `/api/preot/:id` (`{accion:"aprobar",...}`) | Aprueba la Pre-OT: crea la `OrdenTrabajo` real y actualiza el vehículo, todo en una transacción |

Todos devuelven errores con `{ error: string }` y status HTTP apropiado
(`400` validación, `404` no encontrado, `409` conflicto/duplicado, `500` error
interno) — ver `lib/api-helpers.ts`.

