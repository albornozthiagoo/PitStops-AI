# PitStop AI
### Sistema inteligente de prediagnóstico conversacional para talleres mecánicos

## Contexto del proyecto

MVP a 5 días. El canal real es **el WhatsApp Business que el taller ya usa**. El
cliente le escribe ahí como siempre ("el auto no arranca"); del otro lado, en vez
de contestar el mecánico, contesta la IA: hace las preguntas necesarias según un
árbol de decisión dinámico hasta identificar el problema, y cuando tiene
suficiente información genera una **Pre-OT** (preorden de trabajo) estructurada
—síntoma, urgencia, posibles causas, tiempo estimado, herramientas sugeridas— y
se la avisa al técnico. No reemplaza al mecánico: estructura la información
antes de que intervenga.

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
Vercel (deploy).

**Pivot de canal (2026-08-20)**: el plan original elegía WhatsApp Cloud API
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

## Cómo funciona (flujo real)

1. Cliente escribe al WhatsApp Business del taller.
2. El mensaje entra por webhook a n8n.
3. n8n revisa el estado de esa conversación en la base:
   - Si nadie la "tomó" → la pasa a la IA (GPT), que responde por WhatsApp.
   - Si el técnico ya la tomó manualmente → la IA no interviene, el mensaje
     solo se registra para que el técnico lo vea en el panel.
4. La IA repite preguntas dirigidas hasta juntar lo mínimo necesario (vehículo,
   síntoma, contexto, urgencia).
5. Al cerrar el interrogatorio, se genera la Pre-OT y se notifica al técnico
   (panel Next.js + aviso, ej. mensaje interno o notificación).
6. El técnico puede intervenir en cualquier momento desde WhatsApp o desde el
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
el cliente escribe por WhatsApp y la IA responde ahí; el panel debe pasar a ser
un visor con opción de "tomar" la conversación (punto 5 del roadmap).

Lo que falta es conectar todo esto al canal de WhatsApp, un motor de IA real,
autenticación real, automatización con n8n y despliegue. Ese es el foco de los
pasos de abajo.

## Pasos para desarrollar la web correctamente

### 1. Fundamentos
- [ ] Confirmar variables de entorno necesarias (`DATABASE_URL`, `DIRECT_URL`,
      `OPENAI_API_KEY`, credenciales de n8n) y documentarlas en `ui/.env.example`.
- [ ] Correr `prisma migrate dev` contra una base Postgres real (local o Supabase)
      y `db:seed` para tener datos de prueba consistentes con `lib/types.ts`.
- [ ] Decidir dónde vive la sesión/autenticación (NextAuth vs. JWT propio) para
      `Tecnico` — el login ya tiene UI pero no lógica.

### 2. Autenticación básica
- [ ] Implementar login real contra `Tecnico` (passwordHash con bcrypt).
- [ ] Proteger las rutas de `(dashboard)` para que requieran sesión.
- [ ] Mostrar iniciales/rol del técnico logueado en el Topbar (ya hay componente).

### 3. Canal de WhatsApp — Twilio WhatsApp Sandbox + n8n

**A. Alta en Twilio**
- [x] Crear cuenta en [console.twilio.com](https://console.twilio.com).
- [x] Anotar **Account SID** y **Auth Token** (Dashboard principal) — guardados
      en `ui/.env` (nunca en el repo; `ui/.env.example` tiene las claves sin
      valores).
- [ ] Activar el sandbox: *Messaging → Try it out → Send a WhatsApp message*.
      Anotar el **número de sandbox** (`whatsapp:+14155238886`, es el mismo
      para todas las cuentas) y el **join code** propio.
- [ ] Unir el/los número(s) de teléfono personal(es) que van a hacer de
      "cliente" de prueba: desde WhatsApp, mandarle `join <code>` al número de
      sandbox. Se puede sumar más de un número repitiendo el mismo join code.
      A diferencia de Meta (máx. 5 destinatarios verificados), acá no hay un
      límite duro, pero cada sesión de sandbox expira a los 3 días de
      inactividad y hay que volver a unirse.

**B. Webhook**
- [x] Implementado en `ui/app/api/webhooks/whatsapp/route.ts` (Next.js, no
      n8n) — Twilio no tiene handshake GET como Meta, así que no hace falta
      Verify Token; la firma entrante se valida con `TWILIO_AUTH_TOKEN` +
      header `X-Twilio-Signature` vía `twilio.validateRequest`.
- [ ] Exponer el endpoint público: en local con `ngrok http 3000` (o el
      dominio de Vercel en producción) y cargar esa URL + `/api/webhooks/whatsapp`
      en Twilio Console → *WhatsApp Sandbox Settings* → **"WHEN A MESSAGE
      COMES IN"** (método `POST`).
- [ ] Ojo con ngrok: `validateRequest` firma contra la URL pública exacta: el
      código ya usa los headers `x-forwarded-proto`/`x-forwarded-host` para
      reconstruirla en vez de confiar en `req.url` a ciegas, pero si falla la
      validación en dev, confirmar que la URL cargada en Twilio coincide
      carácter a carácter con la del túnel.

**C. Envío de mensajes**
- [x] Implementado en `ui/lib/whatsapp.ts` — usa el SDK oficial `twilio` con
      `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_WHATSAPP_NUMBER`
      para mandar mensajes salientes vía `client.messages.create`.

**D. n8n (orquestación, opcional para el smoke test inicial)**
- [ ] A diferencia del nodo "WhatsApp Trigger" nativo de Meta, Twilio **no**
      tiene trigger propio en n8n para mensajes entrantes — el webhook de
      Next.js (punto B) ya cubre la recepción, así que n8n entra recién para
      orquestar el resto (IA, notificación al técnico) o se lo puede dejar
      fuera del camino crítico si el webhook de Next.js hace todo el flujo
      directo.
- [ ] Si se usa n8n igual: nodo Webhook genérico (no "WhatsApp Trigger") →
      lógica de handoff/IA → nodo HTTP Request contra la API de Twilio (o
      contra `enviarMensajeWhatsapp` expuesto como endpoint interno).

**E. Modelo de datos**
- [ ] Agregar al schema (`Conversacion`) un campo de **modo/handoff**
      (ej. `controladaPor: IA | TECNICO`) para saber si la IA puede responder
      o si el técnico tomó el chat — hoy `EstadoVehiculo` no cubre esto.
- [x] Guardar el número de WhatsApp del cliente en `Cliente.telefono` (ya
      existe en el schema) — el webhook ya lo hace vía `upsert`, guardando el
      número sin el prefijo `whatsapp:`.

### 4. Motor conversacional (núcleo del producto)
- [ ] Diseñar el árbol de preguntas dinámico por tipo de avería (arranque, frenos,
      ruidos, electricidad, etc.) — puede vivir como config/JSON versionado en el repo
      o como prompt estructurado para GPT.
- [ ] Integrar OpenAI GPT: dado el historial de `Mensaje` de esa conversación,
      decidir la siguiente pregunta o si ya hay info suficiente para cerrar el
      interrogatorio. Debe repreguntar ante respuestas ambiguas en vez de asumir.
- [ ] Persistir cada turno en `Mensaje` (autor SISTEMA/TECNICO, texto, tag opcional)
      tanto si lo escribe la IA como si lo escribe el técnico por WhatsApp directo.
- [ ] Definir el prompt/función que clasifica urgencia (`Prioridad`: CRITICA/MEDIA/BAJA)
      a partir de las respuestas.
- [ ] Manejo de fallos: si GPT o WhatsApp fallan, reintentar o degradar a una
      respuesta genérica ("en breve te responde el taller") en vez de dejar al
      cliente sin respuesta — nunca debe fallar en silencio.

### 5. Handoff técnico ↔ IA y panel en vivo
- [ ] Reemplazar los mocks de `chat/page.tsx`: pasa de ser un input manual del
      síntoma a un **visor en vivo** de la conversación real de WhatsApp
      (poll o websocket sobre `app/api/conversaciones/[id]/mensajes`).
- [ ] Botón "Tomar conversación" / "Devolver a la IA" que actualiza el campo
      de handoff — mientras el técnico la tiene tomada, sus mensajes salen por
      WhatsApp normal y la IA no contesta.
- [ ] Indicador visual claro de quién está contestando en cada chat (IA vs.
      técnico) en la lista de conversaciones.
- [ ] Manejar el cierre del interrogatorio: cuando la IA determina que ya tiene
      info suficiente, disparar la generación de la Pre-OT automáticamente.

### 6. Generación de la Pre-OT
- [ ] Endpoint que, a partir de una `Conversacion` cerrada, genera `PreOT` +
      `Hipotesis` (con probabilidad) + `HerramientaSugerida` vía GPT (salida
      estructurada/JSON mode) y persiste con Prisma.
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
- [ ] Workflow principal: `WhatsApp entrante → n8n → chequea handoff en la base
      → (IA responde por WhatsApp) o (solo se registra el mensaje) → si cierra
      el interrogatorio, genera Pre-OT → notifica al técnico`.
- [ ] Notificación al técnico configurable (mensaje interno, email o push —
      definir cuál se demuestra en el MVP).
- [ ] Modularizar el workflow en nodos separados (recepción, decisión de
      handoff, llamada a GPT, envío de WhatsApp, generación de Pre-OT) para que
      un fallo en un tramo no tumbe todo el flujo — mitigación de riesgo de
      integración señalada en el anteproyecto.

### 9. Pulido de UI/UX
- [ ] Revisar estados vacíos, loading y error en cada página (`vehiculos/error.tsx`
      y `loading.tsx` ya son un buen precedente a replicar en las demás).
- [ ] Responsive check en el panel de conversaciones y dashboard.
- [ ] Accesibilidad básica (labels, contraste, foco de teclado) en formularios.

### 10. Pruebas y ajustes
- [ ] Probar el ejemplo del anteproyecto end-to-end mandando un WhatsApp real:
      "el auto no arranca" → Gol Trend 2018 → hace clic → Pre-OT con batería
      descargada / multímetro / 15 min, y aviso recibido por el técnico.
- [ ] Probar el handoff en ambos sentidos: técnico toma la conversación a mitad
      del interrogatorio y la IA deja de responder; la libera y la IA retoma.
- [ ] Validar que el árbol dinámico no haga preguntas de más (riesgo mencionado
      en el anteproyecto).
- [ ] Probar caso de falla (GPT o WhatsApp caído) y confirmar que el cliente
      igual recibe alguna respuesta, no silencio.
- [ ] Revisar que los diagnósticos generados se presenten siempre como
      *prediagnóstico*, nunca como diagnóstico definitivo.

### 11. Deploy
- [ ] Provisionar PostgreSQL de producción (Supabase/Neon/Railway).
- [ ] Configurar variables de entorno en Vercel y desplegar `ui/`.
- [ ] Verificar que las migraciones de Prisma corran en el pipeline de deploy.
- [ ] Confirmar que el número de WhatsApp (test o producción) y el workflow de
      n8n apunten al entorno correcto (no mezclar staging con producción).

### Fuera de alcance del MVP (según anteproyecto)
- Reconocimiento de fotos.
- Análisis de audio del motor.

