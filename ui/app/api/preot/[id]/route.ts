import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, badRequest } from "@/lib/api-helpers";
import { EstadoVehiculo } from "@prisma/client";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const preOt = await prisma.preOT.findUnique({
      where: { id: params.id },
      include: { hipotesis: true, herramientas: true, vehiculo: true, ordenTrabajo: true },
    });

    if (!preOt) {
      return NextResponse.json({ error: "Pre-OT no encontrada" }, { status: 404 });
    }

    return NextResponse.json(preOt);
  } catch (error) {
    return apiError(`GET /api/preot/${params.id}`, error);
  }
}

// PATCH /api/preot/:id  body: { accion: "aprobar", ordenCodigo, descripcion, aprobadaPorId }
// Este es el botón "Aprobar y enviar a taller" de la pantalla Pre-OT.
// Crea la OrdenTrabajo real, marca la Pre-OT como aprobada, y actualiza
// el estado del vehículo — así el Dashboard y el Historial quedan al día
// sin que el frontend tenga que tocar tres tablas por separado.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const { accion, ordenCodigo, descripcion, aprobadaPorId } = body;

    if (accion !== "aprobar") {
      return badRequest('accion inválida. Por ahora solo se soporta "aprobar"');
    }
    if (!ordenCodigo || !descripcion) {
      return badRequest("Faltan campos requeridos: ordenCodigo, descripcion");
    }

    const preOt = await prisma.preOT.findUnique({ where: { id: params.id } });
    if (!preOt) {
      return NextResponse.json({ error: "Pre-OT no encontrada" }, { status: 404 });
    }
    if (preOt.aprobada) {
      return NextResponse.json({ error: "Esta Pre-OT ya fue aprobada" }, { status: 409 });
    }

    const [, ordenTrabajo] = await prisma.$transaction([
      prisma.preOT.update({ where: { id: params.id }, data: { aprobada: true } }),
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
        data: { estado: EstadoVehiculo.EN_COLA }, // pasa a taller, listo para reparar
      }),
    ]);

    return NextResponse.json(ordenTrabajo, { status: 201 });
  } catch (error) {
    return apiError(`PATCH /api/preot/${params.id}`, error);
  }
}
