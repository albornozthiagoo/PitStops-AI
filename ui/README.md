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

prisma/
  schema.prisma  Modelo de datos real (Postgres) — mapea 1:1 con lib/types.ts
  seed.ts        Carga los mismos datos de mock-data.ts en la base
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



## Próximos pasos para que sea funcional de verdad

1. **Autenticación real**: reemplazar el `router.push("/dashboard")` de
   `app/login/page.tsx` por NextAuth.js, Clerk o el proveedor que usen —
   ya hay `passwordHash` en el modelo `Tecnico` esperando un hash real (bcrypt/argon2).
2. ~~Base de datos~~ ✅ ya está en `prisma/schema.prisma`, ver sección de arriba.
3. **API routes**: crear `/app/api/vehiculos`, `/app/api/conversaciones`, `/app/api/preot`
   usando `@prisma/client` y reemplazar los imports de `lib/mock-data.ts` por
   `fetch()` o Server Components que lean directo de la base.
4. **Motor de diagnóstico**: conectar el envío de mensajes en `app/(dashboard)/chat/page.tsx`
   a una API route que llame a un LLM y devuelva JSON estructurado
   (`{ hipotesis: [{nombre, probabilidad}], herramientas: [...], tiempoEstimado }`)
   para alimentar directamente `HypothesisRow` y la Pre-OT.
5. **Persistir Pre-OT**: el botón "Generar Pre-OT" del chat debería hacer un
   `POST /api/preot` real en vez de navegar a datos mock.
6. **Accesibilidad**: agregar `aria-live="polite"` en el log de chat cuando lleguen
   mensajes nuevos del sistema (el `ThinkingIndicator` ya tiene `role="status"`).
7. **Deploy**: Vercel es la opción más directa para Next.js.
