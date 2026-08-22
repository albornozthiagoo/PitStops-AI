import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, badRequest } from "@/lib/api-helpers";
import { AutorMensaje, ControladoPor } from "@/generated/prisma/client";
import { enviarMensajeWhatsapp } from "@/lib/whatsapp";

interface Params {
  // Next.js 15+ pasa `params` como Promise en los Route Handlers — hay que
  // esperarlo antes de leer `.id` (si no, `id` queda `undefined` y Prisma
  // tira "needs at least one of `id` arguments").
  params: Promise<{ id: string }>;
}

// POST /api/conversaciones/:id/mensajes
// body: { texto: string }
// Guarda el mensaje escrito por el técnico, lo manda por WhatsApp al
// cliente, y si la conversación todavía estaba en manos de la IA se la
// pasa a control manual (si un técnico le está escribiendo directamente al
// cliente, no queremos que la IA también le responda al próximo mensaje
// entrante — se pisarían las respuestas).
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { texto } = body;

    if (!texto || typeof texto !== "string" || !texto.trim()) {
      return badRequest("El campo 'texto' es requerido y no puede estar vacío");
    }

    const conversacion = await prisma.conversacion.findUnique({
      where: { id },
      include: { cliente: true },
    });
    if (!conversacion) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    const textoLimpio = texto.trim();

    const mensaje = await prisma.mensaje.create({
      data: {
        conversacionId: id,
        autor: AutorMensaje.TECNICO,
        texto: textoLimpio,
      },
    });

    // Tocar updatedAt de la conversación para que ordene bien en la lista,
    // y asegurar que quede en manos del técnico (ver comentario arriba).
    await prisma.conversacion.update({
      where: { id },
      data: { updatedAt: new Date(), controladoPor: ControladoPor.TECNICO },
    });

    if (conversacion.cliente.telefono) {
      try {
        await enviarMensajeWhatsapp(conversacion.cliente.telefono, textoLimpio);
      } catch (envioError) {
        // El mensaje ya quedó guardado en el sistema — avisamos del fallo
        // de envío pero no lo tratamos como error fatal del endpoint.
        console.error(
          `[api] POST /api/conversaciones/${id}/mensajes: error enviando WhatsApp`,
          envioError
        );
        return NextResponse.json(
          { ...mensaje, avisoEnvio: "El mensaje se guardó pero no se pudo enviar por WhatsApp." },
          { status: 201 }
        );
      }
    }

    return NextResponse.json(mensaje, { status: 201 });
  } catch (error) {
    return apiError(`POST /api/conversaciones/${id}/mensajes`, error);
  }
}
