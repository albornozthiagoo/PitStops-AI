import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, badRequest } from "@/lib/api-helpers";
import { EstadoVehiculo, Prioridad } from "@/generated/prisma/client";

interface Params {
  params: { id: string };
}

// GET /api/vehiculos/:id — ficha completa, la que usaría la Pre-OT y el historial
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        conversaciones: { include: { mensajes: { orderBy: { createdAt: "asc" } } } },
        preOts: { include: { hipotesis: true, herramientas: true } },
        ordenes: { orderBy: { fecha: "desc" } },
      },
    });

    if (!vehiculo) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    }

    return NextResponse.json(vehiculo);
  } catch (error) {
    return apiError(`GET /api/vehiculos/${params.id}`, error);
  }
}

// PATCH /api/vehiculos/:id — típicamente para mover de bahía o cambiar estado/prioridad
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const { estado, prioridad, bahia, sintoma, kilometraje } = body;

    if (estado && !(String(estado).toUpperCase() in EstadoVehiculo)) {
      return badRequest(`estado inválido. Usar: ${Object.keys(EstadoVehiculo).join(", ")}`);
    }
    if (prioridad && !(String(prioridad).toUpperCase() in Prioridad)) {
      return badRequest(`prioridad inválida. Usar: ${Object.keys(Prioridad).join(", ")}`);
    }

    const vehiculo = await prisma.vehiculo.update({
      where: { id: params.id },
      data: {
        estado: estado ? (String(estado).toUpperCase() as EstadoVehiculo) : undefined,
        prioridad: prioridad ? (String(prioridad).toUpperCase() as Prioridad) : undefined,
        bahia: bahia !== undefined ? bahia : undefined,
        sintoma: sintoma !== undefined ? sintoma : undefined,
        kilometraje: kilometraje !== undefined ? Number(kilometraje) : undefined,
      },
    });

    return NextResponse.json(vehiculo);
  } catch (error) {
    return apiError(`PATCH /api/vehiculos/${params.id}`, error);
  }
}
