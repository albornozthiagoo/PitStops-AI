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

El panel Next.js (`ui/`) **no es donde se escribe el mensaje del cliente** — es
el backoffice del taller: monitorea conversaciones en vivo, permite tomar/soltar
el control de una conversación, y muestra Pre-OTs, cola de vehículos e historial.

## Estado actual del repo (`ui/`)

Ya existe un scaffold de Next.js 14 + Prisma con:
- Schema de datos completo (`ui/prisma/schema.prisma`): Taller, Tecnico, Cliente,
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

**Dónde quedamos (2026-08-22)**: pivot completo de canal (WhatsApp/Twilio →
Telegram, ver pivot #2) y de IA (OpenAI → Gemini) por costo — ninguno de los
dos tenía free tier utilizable para un MVP. Motor conversacional (punto 4)
andando con Gemini: junta los 4 datos por preguntas dirigidas y devuelve
JSON `{mensaje, listo}`, con fallback a mensaje genérico si el modelo falla
(nunca deja al cliente sin respuesta). El webhook de Telegram
(`app/api/webhooks/telegram/route.ts`) ya está escrito y compila, pero
**todavía no probado end-to-end** — falta: crear el bot con @BotFather,
cargar `TELEGRAM_BOT_TOKEN`/`TELEGRAM_WEBHOOK_SECRET` en `ui/.env`, y
registrar el webhook (`setWebhook` contra la URL pública de ngrok/Vercel).
Login todavía no funcional (punto 2, el seed tiene password placeholder).
Próximo paso lógico: terminar de dar de alta el bot de Telegram y correr el
smoke test end-to-end (equivalente al que se hizo con Twilio el 2026-08-21).

## Pasos para desarrollar la web correctamente

### 1. Fundamentos
- [x] Confirmar variables de entorno necesarias (`DATABASE_URL`, `DIRECT_URL`,
      `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`/`TELEGRAM_WEBHOOK_SECRET`) y
      documentarlas en `ui/.env.example` — Supabase como Postgres. Credenciales
      de n8n todavía no aplica (n8n sigue fuera del camino crítico, ver punto
      3.D). ⚠️ `TELEGRAM_BOT_TOKEN`/`TELEGRAM_WEBHOOK_SECRET` son placeholders
      vacíos en `ui/.env` — falta crear el bot (ver punto 3.A).
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
      `TELEGRAM_BOT_TOKEN` en `ui/.env` (nunca en el repo).
- [ ] Definir un valor random propio para `TELEGRAM_WEBHOOK_SECRET` (no lo da
      Telegram, lo inventamos nosotros — cualquier string de 1-256 caracteres
      A-Z/a-z/0-9/_/-) y cargarlo también en `ui/.env`.
- [ ] A diferencia de Twilio, no hace falta "unirse" con join code — cualquiera
      que le escriba al bot por su username ya genera un `chat.id` válido.

**B. Webhook**
- [x] Implementado en `ui/app/api/webhooks/telegram/route.ts` — recibe el
      `Update` de Telegram como JSON (no urlencoded como Twilio). La validación
      de origen usa el header `X-Telegram-Bot-Api-Secret-Token` comparado
      contra `TELEGRAM_WEBHOOK_SECRET` (mecanismo propio de Telegram, no hay
      firma HMAC como en Twilio/Meta).
- [ ] Exponer el endpoint público: `ngrok http 3000` en local (o el dominio de
      Vercel en producción) y registrar la URL con una llamada a
      `POST https://api.telegram.org/bot<token>/setWebhook` pasando `url` y
      `secret_token` — a diferencia de Twilio, esto no se hace clickeando en
      una consola, es una llamada a la API (se puede hacer con `curl`).

**C. Envío de mensajes**
- [x] Implementado en `ui/lib/telegram.ts` — `fetch` directo a
      `POST https://api.telegram.org/bot<token>/sendMessage` con
      `{chat_id, text}`. No hace falta SDK, la Bot API es REST simple.

**D. n8n (orquestación, opcional para el smoke test inicial)**
- [ ] Igual que con Twilio: no hay nodo trigger nativo de Telegram para este
      flujo custom — el webhook de Next.js (punto B) ya cubre la recepción, así
      que n8n entra recién para orquestar el resto (notificación al técnico) o
      se lo puede dejar fuera del camino crítico si el webhook de Next.js hace
      todo el flujo directo (que es lo que pasa hoy).

**E. Modelo de datos**
- [ ] Agregar al schema (`Conversacion`) un campo de **modo/handoff**
      (ej. `controladaPor: IA | TECNICO`) para saber si la IA puede responder
      o si el técnico tomó el chat — hoy `EstadoVehiculo` no cubre esto.
- [x] Guardar el `chat.id` de Telegram del cliente en `Cliente.telefono` (ya
      existe en el schema, se reutiliza el campo aunque ya no sea un teléfono
      real) — el webhook lo hace vía `upsert`. `Mensaje.waMessageId` también se
      reutiliza como id externo genérico (`tg:<update_id>`) para dedupe.

### 4. Motor conversacional (núcleo del producto)
- [ ] Diseñar el árbol de preguntas dinámico por tipo de avería (arranque, frenos,
      ruidos, electricidad, etc.) — hoy `lib/diagnostico.ts` tiene un prompt
      fijo que junta 4 datos genéricos (vehículo, síntoma, contexto, urgencia),
      no un árbol distinto por tipo de avería todavía.
- [x] Integrar Gemini (pivot desde OpenAI GPT, ver pivot de IA más arriba):
      dado el historial de `Mensaje` de esa conversación, decide la siguiente
      pregunta o si ya hay info suficiente para cerrar el interrogatorio.
      Repregunta ante respuestas ambiguas en vez de asumir (instruido en el
      system prompt). Implementado en `lib/diagnostico.ts` +
      `lib/gemini.ts`.
- [x] Persistir cada turno en `Mensaje` (autor SISTEMA, texto) — implementado
      en el webhook de Telegram. Falta el caso TECNICO (cuando el técnico
      escribe directo por Telegram, ver punto 5).
- [ ] Definir el prompt/función que clasifica urgencia (`Prioridad`: CRITICA/MEDIA/BAJA)
      a partir de las respuestas.
- [x] Manejo de fallos: si Gemini falla, degrada a una respuesta genérica ("en
      breve te responde el taller") en vez de dejar al cliente sin respuesta —
      confirmado funcionando (probado con la cuenta de OpenAI sin crédito antes
      del pivot). Falta el caso simétrico si falla el envío por Telegram: hoy
      solo se loguea el error, la respuesta queda guardada en `Mensaje` pero no
      le llega al cliente.

### 5. Handoff técnico ↔ IA y panel en vivo
- [ ] Reemplazar los mocks de `chat/page.tsx`: pasa de ser un input manual del
      síntoma a un **visor en vivo** de la conversación real de Telegram
      (poll o websocket sobre `app/api/conversaciones/[id]/mensajes`).
- [ ] Botón "Tomar conversación" / "Devolver a la IA" que actualiza el campo
      de handoff — mientras el técnico la tiene tomada, sus mensajes salen por
      Telegram normal (vía `enviarMensajeTelegram`) y la IA no contesta.
- [ ] Indicador visual claro de quién está contestando en cada chat (IA vs.
      técnico) en la lista de conversaciones.
- [ ] Manejar el cierre del interrogatorio: cuando la IA determina que ya tiene
      info suficiente, disparar la generación de la Pre-OT automáticamente.

### 6. Generación de la Pre-OT
- [ ] Endpoint que, a partir de una `Conversacion` cerrada, genera `PreOT` +
      `Hipotesis` (con probabilidad) + `HerramientaSugerida` vía Gemini (salida
      estructurada/JSON mode, mismo patrón que `lib/diagnostico.ts`) y persiste
      con Prisma.
- [ ] Conectar `preot/page.tsx` a datos reales en vez de `mock-data.ts`.
- [ ] Notificación al técnico cuando se genera (ver punto 8 de n8n).
- [ ] Flujo de aprobación: Pre-OT aprobada por un `Tecnico` → crea `OrdenTrabajo`.

### 7. Dashboard e historial
- [ ] Dashboard: KPIs reales (vehículos en cola, urgencias críticas, tiempo
      promedio, conversaciones activas por IA vs. tomadas por técnico) calculados
      desde la base, no mock.
- [ ] Historial: listado real de `OrdenTrabajo` con filtros básicos.
- [ ] Vista de vehículos conectada a `Vehiculo` (estado, bahía, prioridad).

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
- [ ] Configurar variables de entorno en Vercel y desplegar `ui/`.
- [ ] Verificar que las migraciones de Prisma corran en el pipeline de deploy.
- [ ] Confirmar que el bot de Telegram (test o producción) y el workflow de
      n8n apunten al entorno correcto (no mezclar staging con producción).

### Fuera de alcance del MVP (según anteproyecto)
- Reconocimiento de fotos.
- Análisis de audio del motor.

