# PitStops AI

Sistema inteligente de prediagnóstico conversacional para talleres mecánicos.

El cliente escribe al **WhatsApp Business que el taller ya usa** — "el auto no
arranca" — y del otro lado responde la IA en vez del mecánico: hace las
preguntas justas y necesarias según un árbol dinámico adaptado al síntoma, y
entrega al taller una **Pre-OT** (preorden de trabajo) ya estructurada:
vehículo, síntoma, urgencia, posibles causas, tiempo estimado y herramientas
sugeridas — antes de que el auto llegue al taller.

No reemplaza al mecánico ni da un diagnóstico definitivo, y no es intrusivo: si
el técnico quiere meterse a hablar en cualquier momento, puede tomar la
conversación y la IA se hace a un lado.

> Anteproyecto completo (problema, propuesta de valor, cronograma, riesgos):
> [`docs/Anteproyecto PitStop AI.pdf`](docs/Anteproyecto%20PitStop%20AI.pdf)

## Ejemplo de uso

```
Cliente: Hola, el auto no arranca.
IA:      ¿Qué vehículo es?
Cliente: Gol Trend 2018.
IA:      Cuando giras la llave, ¿qué sucede?
         a) No hace nada
         b) Hace un clic
         c) Gira pero no arranca
         d) Arranca y se apaga
```

Resultado → **Pre-OT #1482**: Gol Trend 2018 · hace clic al arrancar · urgencia
media · posible causa: batería descargada · ~15 min · herramienta: multímetro.

## Stack

| Componente | Tecnología |
|---|---|
| Panel del taller | Next.js 14 (App Router) + React + TypeScript + Tailwind |
| Canal con el cliente | WhatsApp Business (Cloud API o BSP) |
| IA | OpenAI GPT |
| Orquestación | n8n (WhatsApp ↔ IA ↔ base ↔ notificación al técnico) |
| Base de datos | PostgreSQL + Prisma |
| Versionado | GitHub |
| Deploy | Vercel |

## Estructura del repo

```
docs/   Anteproyecto y documentación del proyecto
ui/     App Next.js — frontend, API routes y schema de Prisma
```

La app vive en [`ui/`](ui/) — es el **backoffice del taller**: monitorea las
conversaciones de WhatsApp en vivo, permite tomar/soltar el control de una
conversación, y muestra Pre-OTs, cola de vehículos e historial. No es donde se
escribe el mensaje del cliente. Para levantarla en local:

```bash
cd ui
npm install
npm run dev
```

Abrí http://localhost:3000. Ver [`ui/README.md`](ui/README.md) para el detalle
de estructura de carpetas, setup de base de datos y endpoints disponibles.

## Estado y roadmap

El scaffold de frontend, schema de datos y API routes ya está armado. Falta
conectar el motor de IA, autenticación real y la automatización con n8n. El
checklist completo de pasos pendientes está en [`claude.md`](claude.md).

## Funcionalidades del MVP

| Funcionalidad | MVP |
|---|---|
| Chat con IA | Sí |
| Árbol dinámico de preguntas | Sí |
| Generación de Pre-OT | Sí |
| Clasificación de urgencia | Sí |
| Historial básico | Sí |
| Envío automático al taller (n8n) | Sí |
| Reconocimiento de fotos | No (evolución futura) |
| Análisis de audio del motor | No (evolución futura) |
