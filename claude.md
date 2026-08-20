# PitStop AI
### Sistema inteligente de prediagnóstico conversacional para talleres mecánicos

## Contexto del proyecto

MVP a 5 días. Sistema conversacional que reemplaza el interrogatorio manual de un
taller mecánico: el cliente cuenta el síntoma, la IA hace preguntas dinámicas según
un árbol de decisión, y el resultado es una **Pre-OT** (preorden de trabajo) estructurada
con síntoma, urgencia, posibles causas, tiempo estimado y herramientas sugeridas.
No reemplaza al mecánico: solo estructura la información antes de la intervención humana.

Stack definido en el anteproyecto: Next.js + React (frontend), OpenAI GPT (IA),
n8n (automatización/entrega al taller), Prisma + PostgreSQL (SQLite solo si hace
falta prototipar rápido), GitHub (versionado), Vercel (deploy).

## Estado actual del repo (`ui/`)

Ya existe un scaffold de Next.js 14 + Prisma con:
- Schema de datos completo (`ui/prisma/schema.prisma`): Taller, Tecnico, Cliente,
  Vehiculo, Conversacion, Mensaje, PreOT, Hipotesis, HerramientaSugerida, OrdenTrabajo.
- Páginas: dashboard, chat, preot, historial, vehiculos, login (UI construida, sin
  lógica real conectada todavía).
- Rutas API con Prisma para vehículos, conversaciones/mensajes y pre-OT.
- Datos mock en `lib/mock-data.ts` usados por la UI en lugar del backend real.

Lo que falta es conectar todo esto a un motor de IA real, autenticación real,
automatización con n8n y despliegue. Ese es el foco de los pasos de abajo.

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

### 3. Motor conversacional (núcleo del producto)
- [ ] Diseñar el árbol de preguntas dinámico por tipo de avería (arranque, frenos,
      ruidos, electricidad, etc.) — puede vivir como config/JSON versionado en el repo
      o como prompt estructurado para GPT.
- [ ] Integrar OpenAI GPT: dado el historial de `Mensaje`, decidir la siguiente
      pregunta o si ya hay info suficiente para cerrar el interrogatorio.
- [ ] Persistir cada turno en `Mensaje` (autor SISTEMA/TECNICO, texto, tag opcional).
- [ ] Definir el prompt/función que clasifica urgencia (`Prioridad`: CRITICA/MEDIA/BAJA)
      a partir de las respuestas.

### 4. Conectar el chat real
- [ ] Reemplazar los mocks de `chat/page.tsx` por llamadas a
      `app/api/conversaciones` y `app/api/conversaciones/[id]/mensajes`.
- [ ] Loading states / streaming de la respuesta de la IA en `ChatBubble`.
- [ ] Manejar el cierre del interrogatorio: cuando el árbol/IA determina que ya
      tiene suficiente info, disparar la generación de la Pre-OT.

### 5. Generación de la Pre-OT
- [ ] Endpoint que, a partir de una `Conversacion` cerrada, genera `PreOT` +
      `Hipotesis` (con probabilidad) + `HerramientaSugerida` vía GPT (salida
      estructurada/JSON mode) y persiste con Prisma.
- [ ] Conectar `preot/page.tsx` a datos reales en vez de `mock-data.ts`.
- [ ] Flujo de aprobación: Pre-OT aprobada por un `Tecnico` → crea `OrdenTrabajo`.

### 6. Dashboard e historial
- [ ] Dashboard: KPIs reales (vehículos en cola, urgencias críticas, tiempo
      promedio) calculados desde la base, no mock.
- [ ] Historial: listado real de `OrdenTrabajo` con filtros básicos.
- [ ] Vista de vehículos conectada a `Vehiculo` (estado, bahía, prioridad).

### 7. Automatización con n8n
- [ ] Definir el workflow: `Pre-OT generada → webhook → n8n → notificación al
      taller` (email, WhatsApp o Slack, según lo que se quiera demostrar).
- [ ] Exponer un endpoint/webhook desde Next.js que n8n pueda consumir, o que
      dispare hacia un webhook de n8n al crear la Pre-OT.
- [ ] Modularizar el workflow en n8n (mitigación de riesgo de fallos de integración
      según el anteproyecto).

### 8. Pulido de UI/UX
- [ ] Revisar estados vacíos, loading y error en cada página (`vehiculos/error.tsx`
      y `loading.tsx` ya son un buen precedente a replicar en las demás).
- [ ] Responsive check en chat y dashboard.
- [ ] Accesibilidad básica (labels, contraste, foco de teclado) en formularios.

### 9. Pruebas y ajustes
- [ ] Probar el ejemplo del anteproyecto end-to-end ("el auto no arranca" → Gol
      Trend 2018 → hace clic → Pre-OT con batería descargada / multímetro / 15 min).
- [ ] Validar que el árbol dinámico no haga preguntas de más (riesgo mencionado
      en el anteproyecto).
- [ ] Revisar que los diagnósticos generados se presenten siempre como
      *prediagnóstico*, nunca como diagnóstico definitivo.

### 10. Deploy
- [ ] Provisionar PostgreSQL de producción (Supabase/Neon/Railway).
- [ ] Configurar variables de entorno en Vercel y desplegar `ui/`.
- [ ] Verificar que las migraciones de Prisma corran en el pipeline de deploy.

### Fuera de alcance del MVP (según anteproyecto)
- Reconocimiento de fotos.
- Análisis de audio del motor.
- Integración real con WhatsApp (queda simulada/vía web en el MVP).

