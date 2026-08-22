import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarMensajeTelegram, responderCallbackTelegram, quitarBotonesTelegram } from "@/lib/telegram";
import { correrTurnoDiagnostico } from "@/lib/services/diagnostico";
import { AutorMensaje, ControladoPor, EstadoVehiculo } from "@/generated/prisma/client";

// Webhook de Telegram (Bot API) — reemplaza al canal de WhatsApp (ver pivot
// en claude.md): las cuentas trial de Twilio no dejan mandar mensajes de
// texto libre, solo plantillas fijas, lo que hacía imposible una
// conversación dinámica sin pagar. Telegram no tiene esa restricción y da
// un Bot API gratis sin límite de mensajes para este caso de uso.
// El resto del pipeline (Conversacion/Mensaje, motor de diagnóstico en
// lib/services/diagnostico.ts) es el mismo, es agnóstico al canal.
//
// Además de mensajes de texto, este webhook atiende:
// - /start y /ayuda: comandos fijos, no tocan la conversación en curso.
// - callback_query: el click en uno de los DOS botones de acción que se
//   ofrecen al cerrar un prediagnóstico ("sumar algo más" / "consultar por
//   otro auto"). El diagnóstico en sí (las preguntas del motor de IA)
//   siempre es texto libre — nunca se limita al cliente a tocar botones
//   ahí, porque las fallas de un auto son demasiado variadas para eso.

type TelegramFrom = { first_name?: string; last_name?: string; username?: string };

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    chat: { id: number };
    from?: TelegramFrom;
    text?: string;
  };
  callback_query?: {
    id: string;
    from?: TelegramFrom;
    data?: string;
    message?: {
      message_id: number;
      chat: { id: number };
    };
  };
};

const MENSAJE_BIENVENIDA = `¡Hola! Soy el asistente de prediagnóstico de PitStops AI.

Te hago un par de preguntas cortas sobre el auto y la falla, y armamos un prediagnóstico para que el taller ya te espere sabiendo qué revisar. No reemplaza al mecánico — es para llegar con el diagnóstico adelantado.

Contame con tus propias palabras: ¿qué le está pasando al auto?`;

const MENSAJE_AYUDA = `Puedo ayudarte a armar un prediagnóstico antes de llevar el auto al taller.

Comandos disponibles:
/start — qué es este bot
/ayuda — este mensaje

Para arrancar, contame con tus palabras qué le pasa al auto (un ruido, una luz encendida, que no arranca, etc.) y te voy guiando con preguntas. Respondé como quieras, con tus propias palabras — no hace falta que sea corto ni que elijas de una lista.`;

export async function POST(req: NextRequest) {
  if (!verificarSecreto(req)) {
    return new NextResponse("Firma inválida", { status: 401 });
  }

  const update = (await req.json()) as TelegramUpdate;

  try {
    if (update.callback_query) {
      await procesarCallback(update.callback_query);
    } else if (update.message) {
      await procesarMensaje(update.message, update.update_id);
    }
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

function nombreDe(from: TelegramFrom | undefined, fallback: string): string {
  return [from?.first_name, from?.last_name].filter(Boolean).join(" ") || from?.username || fallback;
}

async function procesarMensaje(mensaje: NonNullable<TelegramUpdate["message"]>, updateId: number) {
  // Por ahora solo procesamos texto. Audio/imagen/stickers quedan afuera.
  if (!mensaje.text) return;

  const chatId = String(mensaje.chat.id);
  const texto = mensaje.text.trim();

  // Comandos fijos: responden directo, sin crear Cliente/Conversacion ni
  // pasar por el motor de diagnóstico.
  if (texto === "/start") {
    await enviarMensajeTelegram(chatId, MENSAJE_BIENVENIDA);
    return;
  }
  if (texto === "/ayuda" || texto === "/help") {
    await enviarMensajeTelegram(chatId, MENSAJE_AYUDA);
    return;
  }

  const nombre = nombreDe(mensaje.from, chatId);
  await procesarTextoCliente({
    chatId,
    nombre,
    texto: mensaje.text,
    // Idempotencia: si Telegram reintenta el webhook, el mismo update_id
    // puede llegar más de una vez.
    externalId: `tg:${updateId}`,
  });
}

async function procesarCallback(query: NonNullable<TelegramUpdate["callback_query"]>) {
  // Confirmá siempre el click, aunque después no se pueda procesar — si no,
  // el botón se queda "girando" del lado del cliente.
  await responderCallbackTelegram(query.id).catch((error) =>
    console.error("[webhook telegram] no se pudo responder el callback:", error)
  );

  const mensajeOriginal = query.message;
  if (!mensajeOriginal || !query.data) return;

  const chatId = String(mensajeOriginal.chat.id);
  await quitarBotonesTelegram(chatId, mensajeOriginal.message_id);

  if (query.data === "nuevo") {
    await enviarMensajeTelegram(chatId, "Buenísimo. Contame: ¿qué le está pasando a este otro auto?");
    return;
  }

  if (query.data.startsWith("continuar:")) {
    const vehiculoId = query.data.slice("continuar:".length);
    await reabrirDiagnostico(vehiculoId, chatId);
  }
}

// El cliente tocó "Sumar algo a este diagnóstico". Si la Pre-OT de ese auto
// todavía no fue aprobada por el taller, reabrimos la MISMA conversación
// (correrTurnoDiagnostico la va a actualizar en vez de duplicarla al
// cerrar de nuevo). Si ya fue aprobada, el técnico puede estar trabajando
// sobre ese documento — no lo tocamos, y arrancamos una conversación nueva
// para el mismo auto en su lugar.
async function reabrirDiagnostico(vehiculoId: string, chatId: string) {
  const vehiculo = await prisma.vehiculo.findUnique({ where: { id: vehiculoId } });
  const conversacionPrevia = await prisma.conversacion.findFirst({
    where: { vehiculoId, estado: EstadoVehiculo.COMPLETADO },
    orderBy: { updatedAt: "desc" },
  });

  if (!vehiculo || !conversacionPrevia) {
    await enviarMensajeTelegram(chatId, "No encontré ese diagnóstico — contame de nuevo qué le pasa al auto.");
    return;
  }

  const preOtPrevia = await prisma.preOT.findUnique({ where: { conversacionId: conversacionPrevia.id } });

  if (preOtPrevia?.aprobada) {
    await prisma.conversacion.create({
      data: {
        clienteId: conversacionPrevia.clienteId,
        vehiculoId,
        titulo: vehiculo.modelo,
        subtitulo: "Seguimiento",
        estado: EstadoVehiculo.DIAGNOSTICANDO,
      },
    });
    await enviarMensajeTelegram(
      chatId,
      `El diagnóstico anterior del ${vehiculo.modelo} (${vehiculo.patente}) ya fue aprobado por el taller, así que armamos uno nuevo para esto. Contame qué notaste.`
    );
    return;
  }

  await prisma.conversacion.update({
    where: { id: conversacionPrevia.id },
    data: { estado: EstadoVehiculo.DIAGNOSTICANDO },
  });
  await enviarMensajeTelegram(chatId, `Dale, seguimos con el ${vehiculo.modelo} (${vehiculo.patente}). Contame qué más notaste.`);
}

async function procesarTextoCliente(args: { chatId: string; nombre: string; texto: string; externalId: string }) {
  const { chatId, nombre, texto, externalId } = args;

  const yaExiste = await prisma.mensaje.findUnique({ where: { waMessageId: externalId } });
  if (yaExiste) return;

  // No usamos número de teléfono real acá — el chat.id de Telegram es el
  // identificador estable del cliente, se guarda en el mismo campo `telefono`.
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
        subtitulo: texto.slice(0, 80),
        estado: EstadoVehiculo.EN_COLA,
      },
    });
  }

  await prisma.mensaje.create({
    data: {
      conversacionId: conversacion.id,
      autor: AutorMensaje.CLIENTE,
      texto,
      waMessageId: externalId,
    },
  });

  await prisma.conversacion.update({
    where: { id: conversacion.id },
    data: { updatedAt: new Date() },
  });

  // Si un técnico tomó la conversación a mano, la IA no responde más: sus
  // mensajes salen por Telegram directo, sin pasar por acá.
  if (conversacion.controladoPor !== ControladoPor.IA) return;

  try {
    const respuesta = await correrTurnoDiagnostico(conversacion.id);
    await enviarMensajeTelegram(chatId, respuesta.texto, respuesta.botones);
  } catch (error) {
    // Nunca dejamos al cliente sin respuesta, aunque el motor de
    // diagnóstico o el envío por Telegram fallen.
    console.error("[webhook telegram] error en el motor de diagnóstico:", error);
    try {
      await enviarMensajeTelegram(
        chatId,
        "Estamos teniendo un problema técnico procesando tu mensaje. En breve te responde alguien del taller."
      );
    } catch (envioError) {
      console.error("[webhook telegram] no se pudo enviar el mensaje de fallback:", envioError);
    }
  }
}
