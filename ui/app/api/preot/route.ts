import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, badRequest } from "@/lib/api-helpers";
import { Prioridad } from "@prisma/client";

// GET /api/preot?vehiculoId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehiculoId = searchParams.get("vehiculoId") ?? undefined;

    const preOts = await prisma.preOT.findMany({
      where: { vehiculoId },
      include: { hipotesis: true, herramientas: true, vehiculo: true },
      orderBy: { generada: "desc" },
    });

    return NextResponse.json(preOts);
  } catch (error) {
    return apiError("GET /api/preot", error);
  }
}

// POST /api/preot — genera el documento a partir del resultado del motor de
// diagnóstico. `codigo` lo arma el caller (ej. correlativo "PRE-OT #4471");
// hipotesis/herramientas ya vienen calculadas por el LLM en este punto.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      codigo,
      vehiculoId,
      conversacionId,
      prioridad,
      sintomaPrincipal,
      tiempoEstimado,
      hipotesis,
      herramientas,
    } = body;

    if (!codigo || !vehiculoId || !conversacionId || !sintomaPrincipal || !tiempoEstimado) {
      return badRequest(
        "Faltan campos requeridos: codigo, vehiculoId, conversacionId, sintomaPrincipal, tiempoEstimado"
      );
    }
    if (!Array.isArray(hipotesis) || hipotesis.length === 0) {
      return badRequest("hipotesis debe ser un array con al menos un elemento {nombre, probabilidad}");
    }
    if (prioridad && !(String(prioridad).toUpperCase() in Prioridad)) {
      return badRequest(`prioridad inválida. Usar: ${Object.keys(Prioridad).join(", ")}`);
    }

    const preOt = await prisma.preOT.create({
      data: {
        codigo,
        vehiculoId,
        conversacionId,
        prioridad: prioridad ? (String(prioridad).toUpperCase() as Prioridad) : Prioridad.MEDIA,
        sintomaPrincipal,
        tiempoEstimado,
        hipotesis: {
          create: hipotesis.map((h: { nombre: string; probabilidad: number }) => ({
            nombre: h.nombre,
            probabilidad: h.probabilidad,
          })),
        },
        herramientas: {
          create: (herramientas ?? []).map((nombre: string) => ({ nombre })),
        },
      },
      include: { hipotesis: true, herramientas: true },
    });

    return NextResponse.json(preOt, { status: 201 });
  } catch (error) {
    return apiError("POST /api/preot", error);
  }
}
