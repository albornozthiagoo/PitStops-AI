import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, badRequest } from "@/lib/api-helpers";
import { AutorMensaje } from "@/generated/prisma/client";

interface Params {
  params: { id: string };
}

// POST /api/conversaciones/:id/mensajes
// body: { texto: string }
// Guarda el mensaje del técnico. La respuesta del motor de diagnóstico
// (autor SISTEMA) se agrega en un segundo paso desde el endpoint del LLM
// (ver README, punto 4 de "Próximos pasos") — este endpoint solo persiste
// lo que escribe el humano.
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const { texto } = body;

    if (!texto || typeof texto !== "string" || !texto.trim()) {
      return badRequest("El campo 'texto' es requerido y no puede estar vacío");
    }

    const conversacion = await prisma.conversacion.findUnique({
      where: { id: params.id },
    });
    if (!conversacion) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    const mensaje = await prisma.mensaje.create({
      data: {
        conversacionId: params.id,
        autor: AutorMensaje.TECNICO,
        texto: texto.trim(),
      },
    });

    // Tocar updatedAt de la conversación para que ordene bien en la lista lateral del chat
    await prisma.conversacion.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(mensaje, { status: 201 });
  } catch (error) {
    return apiError(`POST /api/conversaciones/${params.id}/mensajes`, error);
  }
}
