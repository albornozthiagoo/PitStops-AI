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

## Base de datos (Prisma 7 + Postgres)

> **Prisma 7**: este proyecto usa Prisma ORM 7, que sacó el motor en Rust y
> ahora corre 100% sobre el driver `pg` (node-postgres) vía un *driver
> adapter* (`@prisma/adapter-pg`). Si venías de una versión anterior del
> proyecto (Prisma 5/6), este es un cambio grande: `package.json` ahora es
> `"type": "module"`, la config de conexión vive en `prisma.config.ts` (no
> en `schema.prisma`), y el cliente se genera en `generated/prisma/` en vez
> de `node_modules`. Ver [la guía oficial de migración](https://www.prisma.io/docs/orm/v6/more/upgrades/to-v7)
> si tenés dudas de algún detalle puntual.

**Requisito**: Node ≥ 20.19 (recomendado 22.x). Verificá con `node -v` antes de instalar.

1. Conseguí una base Postgres (Supabase o Neon, gratis). En el dashboard de
   Supabase: botón **"Connect"** → pestaña **"ORMs"** → **Prisma** — te arma
   las dos líneas de conexión listas para copiar.
2. `cp .env.example .env` y completá `DATABASE_URL` y `DIRECT_URL` con
   los dos connection strings (ver comentarios en `.env.example` sobre
   cuál puerto usa cada uno y por qué).
3. Instalá dependencias y generá el cliente:
   ```bash
   npm install
   npx prisma generate
   ```
4. Corré las migraciones:
   ```bash
   npm run db:migrate
   ```
5. Cargá los datos de ejemplo — **ya no es automático** con `migrate dev`
   como en versiones anteriores de Prisma, hay que correrlo aparte:
   ```bash
   npm run db:seed
   ```
6. Para inspeccionar la base con una UI:
   ```bash
   npm run db:studio
   ```

### Si venís de una versión anterior de este proyecto (Prisma 5/6)

Los cambios están todos interconectados (config, imports, tipo de módulo),
así que lo más seguro es reemplazar el proyecto entero por esta versión en
vez de aplicar los cambios a mano archivo por archivo. Los puntos clave si
igual querés compararlo con tu copia local:

- `package.json` tiene `"type": "module"` — por eso `next.config.js` y
  `postcss.config.js` pasaron a `.mjs`.
- Cualquier import de `"@prisma/client"` ahora es `"@/generated/prisma/client"`
  (o `"../generated/prisma/client"` desde `prisma/seed.ts`, que está fuera
  del alias `@/*`).
- `schema.prisma` ya no tiene `url`/`directUrl` en el `datasource` — esa
  configuración se movió a `prisma.config.ts`.
- Cualquier lugar que instancie `new PrismaClient()` (como `lib/prisma.ts`
  y `prisma/seed.ts`) ahora necesita pasarle un `adapter` de
  `@prisma/adapter-pg`.




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

