# PitStops AI

Backoffice del taller: panel Next.js que monitorea las conversaciones de
Telegram en vivo, permite tomar/soltar el control de una conversación, y
muestra Pre-OTs, cola de vehículos e historial. El chat con el cliente pasa
por el bot de Telegram (no por esta app).

## Cómo correrlo

```bash
npm install
npx prisma generate
npm run dev
```

Abrí http://localhost:3000 — te redirige a `/login`. El login es real
(NextAuth v5 + Argon2id contra el modelo `Tecnico`): con la base recién
seedeada, entrá con legajo `tecnico.garcia` y la password de
`SEED_TECNICO_PASSWORD` (ver `.env.example`). Todas las rutas del panel y las
API que mutan datos requieren sesión — solo `/login` y el webhook de Telegram
quedan afuera.

Para que la IA responda mensajes reales de Telegram en local hace falta
además un túnel público (`ngrok http 3000`) y registrar el webhook con
`POST https://api.telegram.org/bot<token>/setWebhook` (`url` + `secret_token`).

## Estructura

```
app/
  login/page.tsx                       Pantalla de login — signIn("credentials", ...) contra NextAuth
  api/auth/[...nextauth]/route.ts      Handlers de NextAuth (GET/POST)
  (dashboard)/layout.tsx               Server Component: valida sesión, Sidebar + Topbar con datos reales
  (dashboard)/dashboard/page.tsx       Dashboard del taller
  (dashboard)/conversaciones/          Lista + detalle de conversaciones (real, Prisma)
  (dashboard)/conversaciones/[id]/     Visor de una conversación + control de handoff (ConversacionThread)
  (dashboard)/preot/                   Pre-OT (lista + documento por vehículo)
  (dashboard)/historial/page.tsx       Historial de órdenes de trabajo
  api/webhooks/telegram/route.ts       Webhook de Telegram — entrada real del cliente (no requiere sesión)
  api/conversaciones/[id]/control/     Handoff: tomar/liberar conversación
  api/conversaciones/[id]/mensajes/    GET (poll del visor) + POST (mensaje manual del técnico → Telegram)
  globals.css                          Reset, utilidades de recorte diagonal, textura hex

proxy.ts   Auth middleware (Next.js 16 renombró "middleware" a "proxy") — bloquea todo
           lo que no esté en el allow-list (/login, /api/auth, /api/webhooks) sin sesión

components/
  ui/              Panel, Button, Badge, Led, ScanLine/ScanBar/ProbBar, HexLogo, Input
  layout/          Sidebar (logout real), Topbar (nombre/iniciales/rol/taller reales, vía props)
  dashboard/       KpiCard, QueueRow
  conversaciones/  ConversacionThread — indicador IA/técnico, handoff, input manual, auto-refresh (poll 4s)
  preot/           HypothesisRow, PreOtDocument
  historial/       HistorialTable

lib/
  auth.ts          NextAuth (Credentials provider, callbacks jwt/session) — runtime Node
  auth.config.ts   Config edge-safe compartida con proxy.ts (sin Prisma/argon2)
  auth/
    password.ts      hashPassword/verifyPassword (Argon2id vía @node-rs/argon2)
    rate-limit.ts     Rate limit en memoria por legajo para intentos de login
  prisma.ts        Singleton de PrismaClient (evita agotar conexiones en dev)
  telegram.ts      enviarMensajeTelegram — Bot API vía fetch, sin SDK
  api-helpers.ts   Helpers de respuesta/error para las API routes (incluye unauthorized())
  date.ts          Formateo de fechas/horas (24hs) compartido por server y client components
  services/
    llm.ts             Cliente LLM genérico compatible con OpenAI (default Groq)
    diagnostico.ts     Motor de diagnóstico: corre un turno, genera la Pre-OT al cerrar
    dashboard.ts       Queries de KPIs del dashboard
    historial.ts       Queries del historial de OTs
    conversaciones.ts  Queries de conversaciones/mensajes
    preot.ts           Queries de Pre-OT
    vehiculos.ts       Queries de vehículos

types/
  next-auth.d.ts   Module augmentation de Session/User/JWT con los campos de Tecnico

prisma/
  schema.prisma    Modelo de datos real (Postgres)
  seed.ts          Datos de ejemplo (taller, técnico, clientes, vehículos, conversaciones) —
                   el técnico se crea con un hash Argon2id real, no un placeholder
```

Todo el sistema de diseño (colores, tipografías, sombras, animaciones) vive en
`tailwind.config.ts`. Ningún componente usa hex sueltos.

## Base de datos (Prisma 7 + Postgres)

> **Prisma 7**: este proyecto usa Prisma ORM 7, que sacó el motor en Rust y
> ahora corre 100% sobre el driver `pg` (node-postgres) vía un *driver
> adapter* (`@prisma/adapter-pg`). `package.json` es `"type": "module"`, la
> config de conexión vive en `prisma.config.ts` (no en `schema.prisma`), y el
> cliente se genera en `generated/prisma/` en vez de `node_modules`.

**Requisito**: Node ≥ 20.19 (recomendado 22.x). Verificá con `node -v` antes de instalar.

1. Conseguí una base Postgres (Supabase o Neon, gratis). En el dashboard de
   Supabase: botón **"Connect"** → pestaña **"ORMs"** → **Prisma** — te arma
   las dos líneas de conexión listas para copiar.
2. `cp .env.example .env` y completá `DATABASE_URL`/`DIRECT_URL` (Postgres),
   `LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL` (motor de IA, default Groq),
   `TELEGRAM_BOT_TOKEN`/`TELEGRAM_WEBHOOK_SECRET` (canal), `AUTH_SECRET`
   (firma la sesión — generála con
   `node -e "console.log(require('crypto').randomBytes(33).toString('base64'))"`)
   y `SEED_TECNICO_PASSWORD` (password del técnico de prueba que carga el
   seed) — ver comentarios en `.env.example` para cómo conseguir cada uno.
3. Instalá dependencias y generá el cliente:
   ```bash
   npm install
   npx prisma generate
   ```
4. Corré las migraciones:
   ```bash
   npm run db:migrate
   ```
5. Cargá los datos de ejemplo:
   ```bash
   npm run db:seed
   ```
6. Para inspeccionar la base con una UI:
   ```bash
   npm run db:studio
   ```

## Próximos pasos para que sea funcional de verdad

1. **Borrar una conversación desde Telegram**: hay comandos/botones para
   iniciar una conversación nueva, pero todavía no uno para borrar una
   existente (cuando el auto ya se reparó) — ver `CLAUDE.md` (raíz, no está
   en el repo).
2. **Notificación al técnico** cuando se genera una Pre-OT (hoy solo se
   revalida el dashboard, sin push/aviso activo) — sin n8n, no se va a usar.
3. **Deploy**: Vercel es la opción más directa para Next.js.

## API routes disponibles

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/vehiculos?estado=&tallerId=` | Lista vehículos, filtrable |
| `POST` | `/api/vehiculos` | Da de alta un vehículo nuevo |
| `GET` | `/api/vehiculos/:id` | Ficha completa (cliente, conversaciones, Pre-OTs, historial) |
| `PATCH` | `/api/vehiculos/:id` | Actualiza estado, prioridad, bahía, síntoma o km |
| `GET` | `/api/conversaciones?vehiculoId=` | Lista conversaciones con sus mensajes |
| `POST` | `/api/conversaciones` | Abre un chat nuevo con el primer mensaje del técnico |
| `PATCH` | `/api/conversaciones/:id/control` (`{accion:"tomar"\|"liberar"}`) | Handoff: técnico toma o devuelve la conversación a la IA |
| `GET` | `/api/conversaciones/:id/mensajes` | Mensajes + `controladoPor` de una conversación — usado por el poll de auto-refresh del visor |
| `POST` | `/api/conversaciones/:id/mensajes` | Mensaje manual del técnico — se persiste y se manda por Telegram |
| `GET` | `/api/preot?vehiculoId=` | Lista Pre-OTs |
| `POST` | `/api/preot` | Genera una Pre-OT manualmente (hipótesis + herramientas ya calculadas) |
| `GET` | `/api/preot/:id` | Detalle de una Pre-OT |
| `PATCH` | `/api/preot/:id` (`{accion:"aprobar",...}`) | Aprueba la Pre-OT: crea la `OrdenTrabajo` real y actualiza el vehículo, todo en una transacción |
| `POST` | `/api/webhooks/telegram` | Entrada real del cliente — Telegram manda acá cada `Update` |

Todas (salvo `/api/webhooks/telegram`, que se autentica con
`TELEGRAM_WEBHOOK_SECRET`) requieren sesión — sin ella devuelven `401`.
Todos los errores tienen forma `{ error: string }` con status HTTP apropiado
(`400` validación, `401` sin sesión, `404` no encontrado, `409`
conflicto/duplicado, `500` error interno) — ver `lib/api-helpers.ts`.
