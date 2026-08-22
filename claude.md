# PitStop AI
### Sistema inteligente de prediagnóstico conversacional para talleres mecánicos

## Contexto del proyecto

MVP a 5 días. El canal real iba a ser **el WhatsApp Business que el taller ya
usa** (ver pivot de canal más abajo: para el MVP se reemplazó por un bot de
Telegram). El cliente le escribe ahí como siempre ("el auto no arranca"); del
otro lado, en vez de contestar el mecánico, contesta la IA: hace las preguntas
necesarias según un árbol de decisión dinámico hasta identificar el problema, y
cuando tiene suficiente información genera una **Pre-OT** (preorden de trabajo)
estructurada —síntoma, urgencia, posibles causas, tiempo estimado, herramientas
sugeridas— y se la avisa al técnico. No reemplaza al mecánico: estructura la
información antes de que intervenga.

Reglas de producto no negociables:
- **No intrusivo**: si el técnico se mete a escribir en la conversación en
  cualquier momento, la IA se calla — el handoff es manual→IA nunca al revés
  sin que el técnico lo decida.
- **No debe fallar**: ante un mensaje ambiguo, la IA repregunta en vez de
  inventar; ante un error del modelo o la integración, el mensaje del cliente
  nunca debe quedar sin respuesta ni perderse.
- Es un *prediagnóstico*, nunca se presenta como diagnóstico definitivo.

Stack definido en el anteproyecto: Next.js + React (panel del taller), OpenAI
GPT (IA conversacional), **WhatsApp vía Twilio (Sandbox)** como canal con el
cliente, n8n (orquestación: WhatsApp ↔ IA ↔ base ↔ notificación), Prisma +
PostgreSQL (SQLite solo si hace falta prototipar rápido), GitHub (versionado),
Vercel (deploy). Ver pivots de canal e IA más abajo — en la práctica el MVP
terminó en Telegram + Gemini, no WhatsApp/Twilio + OpenAI.

**Pivot de canal #1 (2026-08-20)**: el plan original elegía WhatsApp Cloud API
(Meta) directa por sobre un BSP, pero el alta de número de prueba en la
consola de Meta quedó bloqueada por un bug del wizard (la pantalla se
reiniciaba sin mostrar el número, probado en múltiples navegadores/redes/
cuentas). Se pivotea a **Twilio WhatsApp Sandbox**: alta instantánea sin
verificación de negocio, número compartido de sandbox (`+1 415 523 8886`) al
que cada "cliente" de prueba se une mandando un join code por WhatsApp. El
trade-off es que el webhook entrante no tiene nodo trigger nativo en n8n como
el de Meta — se resuelve con un nodo Webhook genérico apuntado desde Twilio
Console. Igual que con Meta, pasar a un número de **producción** real
requeriría eventualmente verificación de negocio en Meta (Twilio es un BSP
sobre la misma plataforma) — no bloquea el MVP.

**Pivot de canal #2, WhatsApp/Twilio → Telegram (2026-08-22)**: con la
recepción de mensajes ya funcionando end-to-end (ver smoke test 2026-08-21),
la cuenta de Twilio resultó ser *trial* y las cuentas trial de Twilio **no
pueden mandar mensajes de WhatsApp de texto libre bajo ninguna circunstancia**
— ni siquiera dentro de la ventana de 24hs de sesión con el cliente (error
`21654 ContentSid Required`, confirmado reproduciendo el envío directo contra
la API). Solo dejan usar 3 plantillas fijas de Twilio (turnos, notificación de
pedido, código de verificación), inútiles para una conversación dinámica.
Arreglarlo requiere cargar mínimo US$20 para upgradear la cuenta, algo que no
tiene sentido pagar para un MVP. Se pivotea a **Telegram Bot API**: gratis, sin
restricción de mensajes de texto libre, sin necesidad de verificación de
negocio ni número de teléfono real. El trade-off es que el producto real del
anteproyecto es WhatsApp (que es lo que el taller ya usa) — Telegram es una
sustitución de canal solo para demostrar el flujo completo en el MVP, no el
canal final pensado para producción. El pipeline de negocio (`Conversacion`,
`Mensaje`, motor de diagnóstico, Pre-OT) es 100% agnóstico al canal, así que
volver a WhatsApp más adelante (vía Twilio pago o Meta Cloud API directa) es
solo cuestión de reimplementar `lib/telegram.ts` +
`app/api/webhooks/telegram/route.ts`, sin tocar el resto.

**Pivot de IA, OpenAI → Gemini (2026-08-21/22)**: la cuenta de OpenAI no tenía
crédito cargado (error `429 insufficient_quota`) y, para un MVP, no tiene
sentido pagar. Se pivotea a **Gemini** (Google AI Studio) vía su endpoint
compatible con la API de OpenAI (`generativelanguage.googleapis.com/v1beta/openai/`),
así que el código en `lib/diagnostico.ts` es casi idéntico — mismo SDK
`openai`, solo cambia `baseURL`/`apiKey`/nombre de modelo (`gemini-2.5-flash`).
Free tier: 15 RPM / 1500 mensajes por día, de sobra para el MVP.

## Cómo funciona (flujo real)

1. Cliente le escribe al bot de Telegram del taller (en el anteproyecto
   original era WhatsApp Business — ver pivot de canal #2).
2. El mensaje entra por webhook a `app/api/webhooks/telegram` (Next.js
   directo; n8n queda fuera del camino crítico, ver punto 3.D/8).
3. El webhook revisa el estado de esa conversación en la base:
   - Si nadie la "tomó" → la pasa a la IA (Gemini), que responde por Telegram.
   - Si el técnico ya la tomó manualmente → la IA no interviene, el mensaje
     solo se registra para que el técnico lo vea en el panel.
4. La IA repite preguntas dirigidas hasta juntar lo mínimo necesario (vehículo,
   síntoma, contexto, urgencia).
5. Al cerrar el interrogatorio, se genera la Pre-OT y se notifica al técnico
   (panel Next.js + aviso, ej. mensaje interno o notificación).
6. El técnico puede intervenir en cualquier momento desde Telegram o desde el
   panel ("tomar conversación"); a partir de ahí la IA queda en pausa para ese
   chat hasta que el técnico la libere o se cierre el caso.

El panel Next.js (`web-app/`) **no es donde se escribe el mensaje del cliente** — es
el backoffice del taller: monitorea conversaciones en vivo, permite tomar/soltar
el control de una conversación, y muestra Pre-OTs, cola de vehículos e historial.

## Estado actual del repo (`web-app/`)

Ya existe un scaffold de Next.js 14 + Prisma con:
- Schema de datos completo (`web-app/prisma/schema.prisma`): Taller, Tecnico, Cliente,
  Vehiculo, Conversacion, Mensaje, PreOT, Hipotesis, HerramientaSugerida, OrdenTrabajo.
- Páginas: dashboard, chat, preot, historial, vehiculos, login (UI construida, sin
  lógica real conectada todavía).
- Rutas API con Prisma para vehículos, conversaciones/mensajes y pre-OT.
- Datos mock en `lib/mock-data.ts` usados por la UI en lugar del backend real.

⚠️ `chat/page.tsx` hoy simula que el **técnico** tipea los mensajes del cliente
en un input dentro del panel. Eso ya no corresponde al flujo real (ver arriba):
el cliente escribe por Telegram y la IA responde ahí; el panel debe pasar a ser
un visor con opción de "tomar" la conversación (punto 5 del roadmap).

Lo que falta es conectar todo esto al canal de mensajería, un motor de IA real,
autenticación real, automatización con n8n y despliegue. Ese es el foco de los
pasos de abajo.

**Dónde quedamos (2026-08-22)**: dos líneas de trabajo en paralelo (Franco en
`feat/wsp`, Thiago directo en `main`) se mergearon a `main` este día — ver
nota de reconciliación al final de este bloque. Resultado combinado:

- **Canal**: pivot completo WhatsApp/Twilio → Telegram (ver pivot #2), por
  costo. Webhook (`app/api/webhooks/telegram/route.ts`) probado end-to-end:
  bot creado con @BotFather, `setWebhook` registrado contra ngrok, mensaje
  real mandado y respondido por la IA. **Funciona de punta a punta.**
- **IA**: pivot OpenAI → LLM genérico compatible con OpenAI (`lib/services/llm.ts`),
  configurado por defecto contra **Gemini** (probado funcionando), con Groq
  como alternativa documentada — por costo, ninguno de los dos providers
  originales tenía free tier utilizable para un MVP.
- **Motor de diagnóstico** (`lib/services/diagnostico.ts`): ya hace bastante
  más que juntar los 4 datos — cuando cierra el interrogatorio, genera la
  Pre-OT completa (`PreOT` + `Hipotesis` + `HerramientaSugerida`), resuelve o
  crea el `Vehiculo` asociado, y revalida `/dashboard` y `/preot/[vehiculoId]`.
  Punto 6 del roadmap (antes "sin empezar") está prácticamente completo.
- **Handoff IA↔técnico** (`ControladoPor` en el schema + endpoints
  `PATCH /api/conversaciones/:id/control` y
  `POST /api/conversaciones/:id/mensajes`): implementado — el webhook de
  Telegram chequea `controladoPor` antes de dejar responder a la IA.
- **Dashboard/historial/Pre-OT/conversaciones**: conectados a datos reales de
  Prisma (dejaron de usar `mock-data.ts`).

Sigue pendiente: login real (punto 2, el seed tiene password placeholder), UI
del handoff en `chat/page.tsx` (los endpoints ya existen, falta el botón +
visor en vivo), árbol de preguntas por tipo de avería (hoy es un único prompt
genérico), y clasificación de urgencia ya está cubierta por el motor (el LLM
devuelve `prioridad` directo).

**Nota de reconciliación (2026-08-22)**: Franco pivoteó canal e IA en
`feat/wsp` mientras Thiago, en paralelo y directo sobre `main`, construía el
motor de diagnóstico completo (con generación de Pre-OT), el handoff, y
conectaba dashboard/historial/Pre-OT a datos reales — sin coordinar entre sí.
Al mergear aparecieron dos implementaciones del motor conversacional
(`lib/diagnostico.ts`+`lib/gemini.ts` de Franco vs. `lib/services/diagnostico.ts`+
`lib/services/llm.ts` de Thiago) y dos webhooks de canal (WhatsApp de Thiago
vs. Telegram de Franco). Se resolvió priorizando: el motor de Thiago (más
completo, ya genera Pre-OT) + el canal de Telegram de Franco (WhatsApp/Twilio
seguía bloqueado por la cuenta trial) — el webhook de Telegram se reescribió
para llamar a `correrTurnoDiagnostico` de Thiago en vez del motor propio de
Franco, que se borró. **Lección para el equipo**: avisar en el chat antes de
tocar `schema.prisma`, el motor de diagnóstico o el canal de mensajería —
son las piezas donde más probable es pisarse.

## Pasos para desarrollar la web correctamente

### 1. Fundamentos
- [x] Confirmar variables de entorno necesarias (`DATABASE_URL`, `DIRECT_URL`,
      `LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL`, `TELEGRAM_BOT_TOKEN`/
      `TELEGRAM_WEBHOOK_SECRET`) y documentarlas en `web-app/.env.example` —
      Supabase como Postgres, LLM apuntando a Gemini por default. Credenciales
      de n8n todavía no aplica (n8n sigue fuera del camino crítico, ver punto
      3.D). Todas cargadas y probadas en `web-app/.env`.
- [x] Correr `prisma migrate dev` contra una base Postgres real (local o Supabase)
      y `db:seed` para tener datos de prueba consistentes con `lib/types.ts`.
      Hecho 2026-08-21 contra Supabase: sin migraciones pendientes, `prisma
      generate` + `db seed` corridos OK (taller, técnico, 4 clientes/vehículos,
      conversaciones, 1 Pre-OT, historial de OTs). ⚠️ El técnico sembrado tiene
      `passwordHash: "REEMPLAZAR_POR_HASH_REAL"` — placeholder, no sirve para
      loguear hasta el punto 2.
- [ ] Decidir dónde vive la sesión/autenticación (NextAuth vs. JWT propio) para
      `Tecnico` — el login ya tiene UI pero no lógica. **Pendiente, sin decidir
      todavía.**

### 2. Autenticación básica
- [ ] Implementar login real contra `Tecnico` (passwordHash con bcrypt).
- [ ] Proteger las rutas de `(dashboard)` para que requieran sesión.
- [ ] Mostrar iniciales/rol del técnico logueado en el Topbar (ya hay componente).

### 3. Canal de Telegram — Bot API + n8n

> Nota histórica: la implementación anterior sobre Twilio WhatsApp Sandbox
> (alta de cuenta, webhook, envío) llegó a funcionar de punta a punta para
> **recibir** mensajes (ver pivot de canal #1 y #2 más arriba), pero se
> abandonó porque las cuentas trial de Twilio no dejan mandar respuestas de
> texto libre. Los pasos A-E de abajo son la versión Telegram, escrita desde
> cero reemplazando esos archivos.

**A. Alta del bot**
- [ ] Desde la app de Telegram, hablarle a **@BotFather** → `/newbot` → elegir
      nombre y username (debe terminar en `bot`, ej. `pitstop_ai_bot`).
      BotFather devuelve el **token** del bot — pegarlo en
      `TELEGRAM_BOT_TOKEN` en `web-app/.env` (nunca en el repo).
- [ ] Definir un valor random propio para `TELEGRAM_WEBHOOK_SECRET` (no lo da
      Telegram, lo inventamos nosotros — cualquier string de 1-256 caracteres
      A-Z/a-z/0-9/_/-) y cargarlo también en `web-app/.env`.
- [ ] A diferencia de Twilio, no hace falta "unirse" con join code — cualquiera
      que le escriba al bot por su username ya genera un `chat.id` válido.

**B. Webhook**
- [x] Implementado en `web-app/app/api/webhooks/telegram/route.ts` — recibe el
      `Update` de Telegram como JSON (no urlencoded como Twilio). La validación
      de origen usa el header `X-Telegram-Bot-Api-Secret-Token` comparado
      contra `TELEGRAM_WEBHOOK_SECRET` (mecanismo propio de Telegram, no hay
      firma HMAC como en Twilio/Meta).
- [x] Endpoint público expuesto con `ngrok http 3000` en local, webhook
      registrado con `setWebhook` (`url` + `secret_token`). **Probado
      end-to-end (2026-08-22)**: mensaje real de Telegram → webhook → IA
      responde por el bot.

**C. Envío de mensajes**
- [x] Implementado en `web-app/lib/telegram.ts` — `fetch` directo a
      `POST https://api.telegram.org/bot<token>/sendMessage` con
      `{chat_id, text}`. No hace falta SDK, la Bot API es REST simple.

**D. n8n (orquestación, opcional para el smoke test inicial)**
- [ ] Igual que con Twilio: no hay nodo trigger nativo de Telegram para este
      flujo custom — el webhook de Next.js (punto B) ya cubre la recepción, así
      que n8n entra recién para orquestar el resto (notificación al técnico) o
      se lo puede dejar fuera del camino crítico si el webhook de Next.js hace
      todo el flujo directo (que es lo que pasa hoy).

**E. Modelo de datos**
- [x] Campo de **modo/handoff** agregado: enum `ControladoPor` (`IA` |
      `TECNICO`) en `Conversacion.controladoPor`, default `IA` — migración
      `20260822033404_sim`. El webhook de Telegram lo chequea antes de dejar
      responder a la IA.
- [x] Guardar el `chat.id` de Telegram del cliente en `Cliente.telefono` (ya
      existe en el schema, se reutiliza el campo aunque ya no sea un teléfono
      real) — el webhook lo hace vía `upsert`. `Mensaje.waMessageId` también se
      reutiliza como id externo genérico (`tg:<update_id>`) para dedupe.

### 4. Motor conversacional (núcleo del producto)

> Implementado en `lib/services/llm.ts` (cliente LLM genérico compatible con
> OpenAI) + `lib/services/diagnostico.ts` (orquesta el turno: llama al LLM,
> persiste el `Mensaje`, y si cierra el interrogatorio genera la Pre-OT
> completa — ver punto 6, ya cubierto acá también). Invocado desde el webhook
> de Telegram vía `correrTurnoDiagnostico(conversacionId)`.

- [ ] Diseñar el árbol de preguntas dinámico por tipo de avería (arranque, frenos,
      ruidos, electricidad, etc.) — hoy es un único system prompt genérico que
      junta vehículo + síntoma, no un árbol distinto por tipo de avería todavía.
- [x] Integrar LLM (pivot desde OpenAI GPT a un cliente genérico, default
      Gemini — ver pivot de IA más arriba): dado el historial de `Mensaje`,
      decide la siguiente pregunta o cierra con un JSON de diagnóstico
      estructurado (`{tipo: "pregunta" | "diagnostico", ...}`). Repregunta ante
      respuestas ambiguas en vez de asumir (instruido en el system prompt).
- [x] Persistir cada turno en `Mensaje` (autor SISTEMA, con `tag: "PitStop AI"`)
      — hecho en `correrTurnoDiagnostico`. El caso TECNICO (mensaje manual vía
      panel) se persiste en `POST /api/conversaciones/:id/mensajes`.
- [x] El LLM devuelve `prioridad` (CRITICA/MEDIA/BAJA) directo en el JSON de
      cierre, normalizada con fallback a MEDIA si viene un valor inesperado.
- [x] Manejo de fallos: si el LLM tira error, el webhook cae al catch y manda
      un mensaje de fallback ("problema técnico, en breve te responde
      alguien del taller") — nunca deja al cliente sin respuesta. Confirmado
      funcionando (reproducido con la cuenta de OpenAI sin crédito antes del
      pivot). Si falla el *envío* por Telegram del fallback, ahí sí solo se
      loguea — último nivel sin cubrir todavía.

### 5. Handoff técnico ↔ IA y panel en vivo
- [x] Backend del handoff: `PATCH /api/conversaciones/:id/control`
      (`{accion: "tomar" | "liberar"}`) cambia `controladoPor`;
      `POST /api/conversaciones/:id/mensajes` persiste el mensaje del técnico,
      lo manda por Telegram, y fuerza `controladoPor: TECNICO`. El webhook de
      Telegram ya respeta el campo (no responde si no es `IA`).
- [ ] Reemplazar los mocks de `chat/page.tsx`: pasa de ser un input manual del
      síntoma a un **visor en vivo** de la conversación real de Telegram
      (poll o websocket sobre `app/api/conversaciones/[id]/mensajes`) con
      botón "Tomar conversación" / "Devolver a la IA" conectado a los
      endpoints de arriba. **Falta la UI**, el backend ya está.
- [ ] Indicador visual claro de quién está contestando en cada chat (IA vs.
      técnico) en la lista de conversaciones.

### 6. Generación de la Pre-OT
- [x] `correrTurnoDiagnostico` (`lib/services/diagnostico.ts`), al cerrar el
      interrogatorio, genera `PreOT` + `Hipotesis` (con probabilidad) +
      `HerramientaSugerida` en una transacción, resuelve/crea el `Vehiculo`
      asociado (por patente si el cliente la dio, si no un placeholder), y
      marca la `Conversacion` como `COMPLETADO`.
- [x] `preot/page.tsx` y `preot/[vehiculoId]/page.tsx` conectados a datos
      reales de Prisma (no `mock-data.ts`, que ya no existe).
- [ ] Notificación al técnico cuando se genera (ver punto 8 de n8n) — hoy solo
      revalida `/dashboard` y `/preot/[vehiculoId]`, no hay push/aviso activo.
- [ ] Flujo de aprobación: Pre-OT aprobada por un `Tecnico` → crea `OrdenTrabajo`.

### 7. Dashboard e historial
- [x] Dashboard e historial conectados a datos reales de Prisma (via
      `lib/services/dashboard.ts` y `lib/services/historial.ts`).
- [ ] Confirmar que los KPIs específicos pedidos por el anteproyecto
      (urgencias críticas, tiempo promedio, conversaciones IA vs. técnico)
      están todos cubiertos, no solo "datos reales en general".
- [ ] Vista de vehículos conectada a `Vehiculo` (estado, bahía, prioridad) —
      confirmar si ya quedó cubierta por el mismo trabajo.

### 8. Automatización con n8n (orquestador central)
- [ ] Workflow principal: `Telegram entrante → n8n → chequea handoff en la base
      → (IA responde por Telegram) o (solo se registra el mensaje) → si cierra
      el interrogatorio, genera Pre-OT → notifica al técnico`.
- [ ] Notificación al técnico configurable (mensaje interno, email o push —
      definir cuál se demuestra en el MVP).
- [ ] Modularizar el workflow en nodos separados (recepción, decisión de
      handoff, llamada a Gemini, envío de Telegram, generación de Pre-OT) para
      que un fallo en un tramo no tumbe todo el flujo — mitigación de riesgo de
      integración señalada en el anteproyecto.

### 9. Pulido de UI/UX
- [ ] Revisar estados vacíos, loading y error en cada página (`vehiculos/error.tsx`
      y `loading.tsx` ya son un buen precedente a replicar en las demás).
- [ ] Responsive check en el panel de conversaciones y dashboard.
- [ ] Accesibilidad básica (labels, contraste, foco de teclado) en formularios.

### 10. Pruebas y ajustes
- [ ] Probar el ejemplo del anteproyecto end-to-end mandando un Telegram real:
      "el auto no arranca" → Gol Trend 2018 → hace clic → Pre-OT con batería
      descargada / multímetro / 15 min, y aviso recibido por el técnico.
- [ ] Probar el handoff en ambos sentidos: técnico toma la conversación a mitad
      del interrogatorio y la IA deja de responder; la libera y la IA retoma.
- [ ] Validar que el árbol dinámico no haga preguntas de más (riesgo mencionado
      en el anteproyecto).
- [ ] Probar caso de falla (Gemini o Telegram caído) y confirmar que el cliente
      igual recibe alguna respuesta, no silencio.
- [ ] Revisar que los diagnósticos generados se presenten siempre como
      *prediagnóstico*, nunca como diagnóstico definitivo.

### 11. Deploy
- [ ] Provisionar PostgreSQL de producción (Supabase/Neon/Railway).
- [ ] Configurar variables de entorno en Vercel y desplegar `web-app/`.
- [ ] Verificar que las migraciones de Prisma corran en el pipeline de deploy.
- [ ] Confirmar que el bot de Telegram (test o producción) y el workflow de
      n8n apunten al entorno correcto (no mezclar staging con producción).

### Fuera de alcance del MVP (según anteproyecto)
- Reconocimiento de fotos.
- Análisis de audio del motor.

