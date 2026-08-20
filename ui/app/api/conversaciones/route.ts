import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, badRequest } from "@/lib/api-helpers";
import { AutorMensaje, EstadoVehiculo } from "@/generated/prisma/client";

// GET /api/conversaciones?vehiculoId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehiculoId = searchParams.get("vehiculoId") ?? undefined;

    const conversaciones = await prisma.conversacion.findMany({
      where: { vehiculoId },
      include: {
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

// POST /api/conversaciones — abre un chat nuevo para un vehículo,
// con el primer mensaje del técnico ya cargado.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vehiculoId, tecnicoId, titulo, subtitulo, primerMensaje } = body;

    if (!vehiculoId || !tecnicoId || !titulo || !primerMensaje) {
      return badRequest("Faltan campos requeridos: vehiculoId, tecnicoId, titulo, primerMensaje");
    }

    const conversacion = await prisma.conversacion.create({
      data: {
        vehiculoId,
        tecnicoId,
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
