import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { apiError, badRequest } from "@/lib/api-helpers";
import { EstadoVehiculo, Prioridad } from "@/generated/prisma/client";

interface Params {
  // Next.js 15+ pasa `params` como Promise en los Route Handlers — hay que
  // esperarlo antes de leer `.id` (si no, `id` queda `undefined` y Prisma
  // tira "needs at least one of `id` arguments").
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const preOt = await prisma.preOT.findUnique({
      where: { id },
      include: { hipotesis: true, herramientas: true, vehiculo: true, ordenTrabajo: true },
    });

    if (!preOt) {
      return NextResponse.json({ error: "Pre-OT no encontrada" }, { status: 404 });
    }

    return NextResponse.json(preOt);
  } catch (error) {
    return apiError(`GET /api/preot/${id}`, error);
  }
}

// PATCH /api/preot/:id
//
// Dos usos según el campo `accion`:
//
// 1. body: { accion: "aprobar", ordenCodigo, descripcion, aprobadaPorId }
//    Es el botón "Aprobar y enviar a taller" de la pantalla Pre-OT. Crea la
//    OrdenTrabajo real, marca la Pre-OT como aprobada, y actualiza el
//    estado del vehículo — así el Dashboard y el Historial quedan al día
//    sin que el frontend tenga que tocar tres tablas por separado.
//
// 2. body sin `accion` (o accion: "editar"): { sintomaPrincipal?,
//    tiempoEstimado?, prioridad?, herramientas? }
//    Es el botón "Editar" — permite corregir a mano lo que generó la IA
//    antes de aprobar. `herramientas`, si viene, es un array de strings y
//    reemplaza la lista completa. No se puede editar una Pre-OT ya
//    aprobada.
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { accion } = body;

    if (accion === "aprobar") {
      return aprobar(id, body);
    }
    if (accion && accion !== "editar") {
      return badRequest('accion inválida. Usar "aprobar", "editar" o dejarla vacía');
    }
    return editar(id, body);
  } catch (error) {
    return apiError(`PATCH /api/preot/${id}`, error);
  }
}

async function aprobar(
  id: string,
  body: { ordenCodigo?: string; descripcion?: string; aprobadaPorId?: string }
) {
  const { ordenCodigo, descripcion, aprobadaPorId } = body;

  if (!ordenCodigo || !descripcion) {
    return badRequest("Faltan campos requeridos: ordenCodigo, descripcion");
  }

  const preOt = await prisma.preOT.findUnique({ where: { id } });
  if (!preOt) {
    return NextResponse.json({ error: "Pre-OT no encontrada" }, { status: 404 });
  }
  if (preOt.aprobada) {
    return NextResponse.json({ error: "Esta Pre-OT ya fue aprobada" }, { status: 409 });
  }

  const [, ordenTrabajo] = await prisma.$transaction([
    prisma.preOT.update({ where: { id }, data: { aprobada: true } }),
    prisma.ordenTrabajo.create({
      data: {
        codigo: ordenCodigo,
        descripcion,
        vehiculoId: preOt.vehiculoId,
        preOtId: preOt.id,
        aprobadaPorId: aprobadaPorId ?? null,
      },
    }),
    prisma.vehiculo.update({
      where: { id: preOt.vehiculoId },
      // EN_COLA es el estado de ANTES de diagnosticar (auto recién llegado,
      // todavía sin revisar) — ver seed.ts, donde Hilux está EN_COLA sin
      // haber arrancado el diagnóstico. Una vez que el técnico aprueba la
      // Pre-OT, el trabajo de prediagnóstico terminó: pasa a COMPLETADO,
      // desaparece de la cola activa del dashboard y queda visible en el
      // historial con su Orden de Trabajo real.
      data: { estado: EstadoVehiculo.COMPLETADO },
    }),
  ]);

  // El dashboard y el historial cachean su render en el servidor
  // (`force-dynamic` evita el caché estático, pero el Router Cache del
  // cliente igual puede servir una versión vieja al navegar). Avisarle a
  // Next que invalide esas rutas es lo que hace que las tarjetas del
  // dashboard y la lista de historial se vean actualizadas apenas
  // apruebas, sin tener que recargar la página a mano.
  revalidatePath("/dashboard");
  revalidatePath("/historial");
  revalidatePath(`/preot/${preOt.vehiculoId}`);

  return NextResponse.json(ordenTrabajo, { status: 201 });
}

async function editar(
  id: string,
  body: {
    sintomaPrincipal?: string;
    tiempoEstimado?: string;
    prioridad?: string;
    herramientas?: string[];
  }
) {
  const { sintomaPrincipal, tiempoEstimado, prioridad, herramientas } = body;

  if (prioridad && !(String(prioridad).toUpperCase() in Prioridad)) {
    return badRequest(`prioridad inválida. Usar: ${Object.keys(Prioridad).join(", ")}`);
  }
  if (herramientas && !Array.isArray(herramientas)) {
    return badRequest("herramientas debe ser un array de strings");
  }

  const preOt = await prisma.preOT.findUnique({ where: { id } });
  if (!preOt) {
    return NextResponse.json({ error: "Pre-OT no encontrada" }, { status: 404 });
  }
  if (preOt.aprobada) {
    return NextResponse.json({ error: "No se puede editar una Pre-OT ya aprobada" }, { status: 409 });
  }

  const actualizada = await prisma.preOT.update({
    where: { id },
    data: {
      sintomaPrincipal: sintomaPrincipal !== undefined ? sintomaPrincipal : undefined,
      tiempoEstimado: tiempoEstimado !== undefined ? tiempoEstimado : undefined,
      prioridad: prioridad ? (String(prioridad).toUpperCase() as Prioridad) : undefined,
      herramientas: herramientas
        ? {
            deleteMany: {},
            create: herramientas
              .map((nombre) => nombre.trim())
              .filter(Boolean)
              .map((nombre) => ({ nombre })),
          }
        : undefined,
    },
    include: { hipotesis: true, herramientas: true },
  });

  return NextResponse.json(actualizada);
}
