# PitStop AI

Sistema inteligente de prediagnóstico conversacional para talleres mecánicos.

Cuando un cliente escribe "el auto no arranca", PitStop AI hace las preguntas
justas y necesarias (según un árbol dinámico adaptado al síntoma), y entrega al
taller una **Pre-OT** (preorden de trabajo) ya estructurada: vehículo, síntoma,
urgencia, posibles causas, tiempo estimado y herramientas sugeridas — antes de
que el auto llegue al taller.

No reemplaza al mecánico ni da un diagnóstico definitivo: automatiza el
interrogatorio inicial y convierte una conversación informal en información
técnica utilizable.

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
| Frontend | Next.js 14 (App Router) + React + TypeScript + Tailwind |
| IA | OpenAI GPT |
| Automatización | n8n |
| Base de datos | PostgreSQL + Prisma |
| Versionado | GitHub |
| Deploy | Vercel |

## Estructura del repo

```
docs/   Anteproyecto y documentación del proyecto
ui/     App Next.js — frontend, API routes y schema de Prisma
```

La app vive en [`ui/`](ui/). Para levantarla en local:

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
