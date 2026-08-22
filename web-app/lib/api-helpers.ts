import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

/**
 * Envuelve un handler de API route: loguea el error real en el servidor y
 * devuelve una respuesta JSON consistente, distinguiendo errores conocidos
 * de Prisma (constraint únicos, registro no encontrado) de errores genéricos.
 */
export function apiError(context: string, error: unknown): NextResponse {
  console.error(`[api] ${context}:`, error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un registro con ese valor único (patente, VIN, código, etc.)" },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "JSON de entrada inválido" }, { status: 400 });
  }

  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}
