import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, badRequest } from "@/lib/api-helpers";
import { EstadoVehiculo, Prioridad } from "@prisma/client";

// GET /api/vehiculos?estado=diagnosticando&tallerId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado")?.toUpperCase();
    const tallerId = searchParams.get("tallerId") ?? undefined;

    if (estado && !(estado in EstadoVehiculo)) {
      return badRequest(`estado inválido. Usar: ${Object.keys(EstadoVehiculo).join(", ")}`);
    }

    const vehiculos = await prisma.vehiculo.findMany({
      where: {
        tallerId,
        estado: estado ? (estado as EstadoVehiculo) : undefined,
      },
      include: { cliente: true },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(vehiculos);
  } catch (error) {
    return apiError("GET /api/vehiculos", error);
  }
}

// POST /api/vehiculos — alta de una unidad nueva en el taller
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patente, vin, modelo, kilometraje, sintoma, clienteId, tallerId, bahia, prioridad } = body;

    if (!patente || !vin || !modelo || !clienteId || !tallerId || sintoma === undefined) {
      return badRequest(
        "Faltan campos requeridos: patente, vin, modelo, kilometraje, sintoma, clienteId, tallerId"
      );
    }

    if (prioridad && !(String(prioridad).toUpperCase() in Prioridad)) {
      return badRequest(`prioridad inválida. Usar: ${Object.keys(Prioridad).join(", ")}`);
    }

    const vehiculo = await prisma.vehiculo.create({
      data: {
        patente,
        vin,
        modelo,
        kilometraje: Number(kilometraje) || 0,
        sintoma,
        bahia: bahia ?? null,
        prioridad: prioridad ? (String(prioridad).toUpperCase() as Prioridad) : Prioridad.MEDIA,
        estado: EstadoVehiculo.EN_COLA,
        clienteId,
        tallerId,
      },
    });

    return NextResponse.json(vehiculo, { status: 201 });
  } catch (error) {
    return apiError("POST /api/vehiculos", error);
  }
}
