import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarMensajeTelegram } from "@/lib/telegram";
import { generarRespuestaDiagnostico } from "@/lib/diagnostico";
import { AutorMensaje, EstadoVehiculo } from "@/generated/prisma/client";

// Webhook de Telegram (Bot API) — reemplaza al canal de WhatsApp/Twilio
// (ver pivot en claude.md): las cuentas trial de Twilio no dejan mandar
// mensajes de texto libre, solo plantillas fijas, lo que hacía imposible
// una conversación dinámica sin pagar. Telegram no tiene esa restricción y
// da un Bot API gratis sin límite de mensajes para este caso de uso.
// El resto del pipeline (Conversacion/Mensaje, motor de diagnóstico) es el
// mismo, es agnóstico al canal.

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    chat: { id: number };
    from?: { first_name?: string; last_name?: string; username?: string };
    text?: string;
  };
};

export async function POST(req: NextRequest) {
  if (!verificarSecreto(req)) {
    return new NextResponse("Firma inválida", { status: 401 });
  }

  const update = (await req.json()) as TelegramUpdate;

  try {
    await procesarMensajeEntrante(update);
  } catch (error) {
    // Telegram reintenta si no respondemos rápido — logueamos pero igual
    // respondemos 200 para no entrar en un loop de reintentos.
    console.error("[webhook telegram] error procesando payload:", error);
  }

  return new NextResponse("", { status: 200 });
}

function verificarSecreto(req: NextRequest): boolean {
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secreto) {
    console.warn(
      "[webhook telegram] TELEGRAM_WEBHOOK_SECRET no configurado — validación deshabilitada. OK en dev, NO dejar así en producción."
    );
    return true;
  }

  return req.headers.get("x-telegram-bot-api-secret-token") === secreto;
}

async function procesarMensajeEntrante(update: TelegramUpdate) {
  const mensaje = update.message;

  // Por ahora solo procesamos texto. Audio/imagen/stickers quedan afuera.
  if (!mensaje?.text) return;

  // Idempotencia: si Telegram reintenta el webhook, el mismo update_id puede
  // llegar más de una vez.
  const externalId = `tg:${update.update_id}`;
  const yaExiste = await prisma.mensaje.findUnique({ where: { waMessageId: externalId } });
  if (yaExiste) return;

  // No usamos número de teléfono real acá — el chat.id de Telegram es el
  // identificador estable del cliente, se guarda en el mismo campo `telefono`.
  const chatId = String(mensaje.chat.id);
  const nombre =
    [mensaje.from?.first_name, mensaje.from?.last_name].filter(Boolean).join(" ") ||
    mensaje.from?.username ||
    chatId;

  const cliente = await prisma.cliente.upsert({
    where: { telefono: chatId },
    update: {},
    create: { telefono: chatId, nombre },
  });

  let conversacion = await prisma.conversacion.findFirst({
    where: { clienteId: cliente.id, estado: { not: EstadoVehiculo.COMPLETADO } },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversacion) {
    conversacion = await prisma.conversacion.create({
      data: {
        clienteId: cliente.id,
        titulo: cliente.nombre,
        subtitulo: mensaje.text.slice(0, 80),
        estado: EstadoVehiculo.EN_COLA,
      },
    });
  }

  await prisma.mensaje.create({
    data: {
      conversacionId: conversacion.id,
      autor: AutorMensaje.CLIENTE,
      texto: mensaje.text,
      waMessageId: externalId,
    },
  });

  await prisma.conversacion.update({
    where: { id: conversacion.id },
    data: { updatedAt: new Date() },
  });

  const { texto, listo } = await generarRespuestaDiagnostico(conversacion.id);

  await prisma.mensaje.create({
    data: {
      conversacionId: conversacion.id,
      autor: AutorMensaje.SISTEMA,
      texto,
    },
  });

  try {
    await enviarMensajeTelegram(chatId, texto);
  } catch (error) {
    // Ya persistimos la respuesta en Mensaje aunque el envío falle, así el
    // técnico la ve en el panel — pero el cliente se queda sin el mensaje.
    // Sin cola de reintentos todavía (fuera de alcance de este paso).
    console.error("[webhook telegram] error enviando respuesta por Telegram:", error);
  }

  // TODO (roadmap punto 6 en claude.md): cuando `listo` es true, generar la
  // PreOT (hipótesis + herramientas) a partir del historial y notificar al
  // técnico en vez de solo loguearlo.
  if (listo) {
    console.log(`[webhook telegram] conversación ${conversacion.id} lista para Pre-OT`);
  }
}
