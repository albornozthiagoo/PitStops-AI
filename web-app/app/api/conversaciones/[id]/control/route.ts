import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, badRequest, unauthorized } from "@/lib/api-helpers";
import { ControladoPor } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";

interface Params {
  // Next.js 15+ pasa `params` como Promise en los Route Handlers — hay que
  // esperarlo antes de leer `.id` (si no, `id` queda `undefined` y Prisma
  // tira "needs at least one of `id` arguments").
  params: Promise<{ id: string }>;
}

// PATCH /api/conversaciones/:id/control
// body: { accion: "tomar" | "liberar" }
// "tomar": un técnico toma el control manual de la conversación — el motor
// de diagnóstico (IA) deja de responder a los mensajes entrantes de este
// cliente hasta que se libere.
// "liberar": se la devuelve a la IA.
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    // El middleware ya bloquea esto sin sesión — se repite acá como defensa
    // en profundidad, por si algún día cambia el matcher del middleware.
    if (!(await auth())) return unauthorized();

    const body = await req.json();
    const { accion } = body;

    if (accion !== "tomar" && accion !== "liberar") {
      return badRequest("El campo 'accion' debe ser 'tomar' o 'liberar'");
    }

    const conversacion = await prisma.conversacion.update({
      where: { id },
      data: {
        controladoPor: accion === "tomar" ? ControladoPor.TECNICO : ControladoPor.IA,
      },
    });

    return NextResponse.json({
      id: conversacion.id,
      controladoPor: conversacion.controladoPor,
    });
  } catch (error) {
    return apiError(`PATCH /api/conversaciones/${id}/control`, error);
  }
}
