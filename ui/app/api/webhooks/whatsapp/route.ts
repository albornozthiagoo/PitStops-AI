import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import { AutorMensaje, EstadoVehiculo } from "@/generated/prisma/client";

// Webhook de WhatsApp vía Twilio (Sandbox). Reemplaza el chat en vivo que
// tenía la UI: el cliente le escribe al número de WhatsApp del taller, acá
// se persiste cada mensaje entrante como Conversacion/Mensaje (mismo modelo
// de siempre), y cuando el motor de diagnóstico esté conectado (ver
// claude.md, roadmap punto 4), genera el PreOT y responde por el mismo
// medio con enviarMensajeWhatsapp.

// POST — mensajes entrantes. A diferencia de Meta, Twilio no tiene handshake
// GET: la URL se pega directo en Console → WhatsApp Sandbox Settings →
// "WHEN A MESSAGE COMES IN", y el body llega como
// application/x-www-form-urlencoded (no JSON).
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  if (!verificarFirma(req, params)) {
    return new NextResponse("Firma inválida", { status: 401 });
  }

  try {
    await procesarMensajeEntrante(params);
  } catch (error) {
    // Twilio reintenta si no devolvemos 2xx rápido — logueamos pero igual
    // respondemos 200 para no entrar en un loop de reintentos.
    console.error("[webhook whatsapp] error procesando payload:", error);
  }

  // Twilio acepta un 200 vacío como confirmación de recepción.
  return new NextResponse("", { status: 200 });
}

function verificarFirma(req: NextRequest, params: Record<string, string>): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.warn(
      "[webhook whatsapp] TWILIO_AUTH_TOKEN no configurado — firma sin verificar. OK en dev, NO dejar así en producción."
    );
    return true;
  }

  const firma = req.headers.get("x-twilio-signature") ?? "";
  return twilio.validateRequest(authToken, firma, urlExternaDelWebhook(req), params);
}

// Twilio firma contra la URL pública exacta que llamó (la cargada en
// Console). Si el server corre detrás de un túnel (ngrok en dev) o un proxy
// (Vercel), req.url puede reflejar el host/protocolo internos en vez del
// público — usamos los headers x-forwarded-* cuando están presentes.
function urlExternaDelWebhook(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (proto && host) {
    return `${proto}://${host}${new URL(req.url).pathname}`;
  }
  return req.url;
}

async function procesarMensajeEntrante(params: Record<string, string>) {
  const { MessageSid, From, Body, ProfileName } = params;

  // Por ahora solo procesamos texto. Audio/imagen quedan para más adelante.
  if (!Body) return;

  // Idempotencia: Twilio puede reintentar el webhook si no respondemos
  // rápido, así que un mismo MessageSid puede llegar más de una vez.
  const yaExiste = await prisma.mensaje.findUnique({ where: { waMessageId: MessageSid } });
  if (yaExiste) return;

  // Twilio manda el remitente como "whatsapp:+5491122334455" — guardamos el
  // número pelado (E.164) en Cliente.telefono.
  const telefono = From.replace(/^whatsapp:/, "");

  const cliente = await prisma.cliente.upsert({
    where: { telefono },
    update: {},
    create: { telefono, nombre: ProfileName || telefono },
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
        subtitulo: Body.slice(0, 80),
        estado: EstadoVehiculo.EN_COLA,
      },
    });
  }

  await prisma.mensaje.create({
    data: {
      conversacionId: conversacion.id,
      autor: AutorMensaje.CLIENTE,
      texto: Body,
      waMessageId: MessageSid,
    },
  });

  await prisma.conversacion.update({
    where: { id: conversacion.id },
    data: { updatedAt: new Date() },
  });

  // TODO (roadmap punto 4 en claude.md): acá se dispara el motor de
  // diagnóstico contra el historial de mensajes de `conversacion`. Cuando
  // devuelva hipótesis/herramientas, crear el PreOT (POST /api/preot) y
  // avisarle al cliente con enviarMensajeWhatsapp(telefono, "...").
}
