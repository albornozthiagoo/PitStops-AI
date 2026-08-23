import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, badRequest, unauthorized } from "@/lib/api-helpers";
import { AutorMensaje, ControladoPor } from "@/generated/prisma/client";
import { enviarMensajeTelegram } from "@/lib/telegram";
import { auth } from "@/lib/auth";
import { formatFechaHora } from "@/lib/date";

interface Params {
  // Next.js 15+ pasa `params` como Promise en los Route Handlers — hay que
  // esperarlo antes de leer `.id` (si no, `id` queda `undefined` y Prisma
  // tira "needs at least one of `id` arguments").
  params: Promise<{ id: string }>;
}

// GET /api/conversaciones/:id/mensajes
// Usado por el polling de ConversacionThread.tsx para el auto-refresh del
// visor — devuelve solo lo que ese componente necesita (mensajes +
// controladoPor), no la conversación completa con cliente/vehículo.
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    if (!(await auth())) return unauthorized();

    const conversacion = await prisma.conversacion.findUnique({
      where: { id },
      select: {
        controladoPor: true,
        mensajes: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conversacion) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      controladoPor: conversacion.controladoPor,
      mensajes: conversacion.mensajes.map((m) => ({
        id: m.id,
        autor: m.autor,
        texto: m.texto,
        fecha: formatFechaHora(m.createdAt),
      })),
    });
  } catch (error) {
    return apiError(`GET /api/conversaciones/${id}/mensajes`, error);
  }
}

// POST /api/conversaciones/:id/mensajes
// body: { texto: string }
// Guarda el mensaje escrito por el técnico, lo manda por Telegram al
// cliente, y si la conversación todavía estaba en manos de la IA se la
// pasa a control manual (si un técnico le está escribiendo directamente al
// cliente, no queremos que la IA también le responda al próximo mensaje
// entrante — se pisarían las respuestas).
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    // El middleware ya bloquea esto sin sesión — se repite acá como defensa
    // en profundidad, por si algún día cambia el matcher del middleware.
    if (!(await auth())) return unauthorized();

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
        await enviarMensajeTelegram(conversacion.cliente.telefono, textoLimpio);
      } catch (envioError) {
        // El mensaje ya quedó guardado en el sistema — avisamos del fallo
        // de envío pero no lo tratamos como error fatal del endpoint.
        console.error(
          `[api] POST /api/conversaciones/${id}/mensajes: error enviando Telegram`,
          envioError
        );
        return NextResponse.json(
          { ...mensaje, avisoEnvio: "El mensaje se guardó pero no se pudo enviar por Telegram." },
          { status: 201 }
        );
      }
    }

    return NextResponse.json(mensaje, { status: 201 });
  } catch (error) {
    return apiError(`POST /api/conversaciones/${id}/mensajes`, error);
  }
}
