import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, badRequest } from "@/lib/api-helpers";
import { AutorMensaje, EstadoVehiculo } from "@/generated/prisma/client";

// GET /api/conversaciones?vehiculoId=xxx&clienteId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehiculoId = searchParams.get("vehiculoId") ?? undefined;
    const clienteId = searchParams.get("clienteId") ?? undefined;

    const conversaciones = await prisma.conversacion.findMany({
      where: { vehiculoId, clienteId },
      include: {
        cliente: true,
        vehiculo: true,
        mensajes: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(conversaciones);
  } catch (error) {
    return apiError("GET /api/conversaciones", error);
  }
}

// POST /api/conversaciones — abre un chat manualmente (uso del técnico
// desde el dashboard). El flujo normal es que el webhook de Telegram
// (app/api/webhooks/telegram) cree la conversación solo, así que acá
// solo `clienteId` es obligatorio: `vehiculoId`/`tecnicoId` se asignan
// después, cuando se identifica el vehículo o un técnico toma el caso.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clienteId, vehiculoId, tecnicoId, titulo, subtitulo, primerMensaje } = body;

    if (!clienteId || !titulo || !primerMensaje) {
      return badRequest("Faltan campos requeridos: clienteId, titulo, primerMensaje");
    }

    const conversacion = await prisma.conversacion.create({
      data: {
        clienteId,
        vehiculoId: vehiculoId ?? undefined,
        tecnicoId: tecnicoId ?? undefined,
        titulo,
        subtitulo: subtitulo ?? "",
        estado: EstadoVehiculo.EN_COLA,
        mensajes: {
          create: [{ autor: AutorMensaje.TECNICO, texto: primerMensaje }],
        },
      },
      include: { mensajes: true },
    });

    return NextResponse.json(conversacion, { status: 201 });
  } catch (error) {
    return apiError("POST /api/conversaciones", error);
  }
}
