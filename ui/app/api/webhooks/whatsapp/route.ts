import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { AutorMensaje, EstadoVehiculo } from "@/generated/prisma/client";

// Webhook de WhatsApp Cloud API (Meta). Reemplaza el chat en vivo que tenía
// la UI: el cliente le escribe al número de WhatsApp del taller, acá se
// persiste cada mensaje entrante como Conversacion/Mensaje (mismo modelo de
// siempre), y cuando el motor de diagnóstico esté conectado (ver
// pitstop-ai-context.md, roadmap punto 4), genera el PreOT y responde por
// el mismo medio con enviarMensajeWhatsapp.

interface WhatsappMensaje {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
}

interface WhatsappContacto {
  profile?: { name?: string };
}

// GET — handshake de verificación que exige Meta al configurar el webhook
// (Meta → tu app → WhatsApp → Configuration → Webhook).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// POST — mensajes entrantes.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verificarFirma(req, rawBody)) {
    return new NextResponse("Firma inválida", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("JSON inválido", { status: 400 });
  }

  try {
    for (const entrada of payload.entry ?? []) {
      for (const cambio of entrada.changes ?? []) {
        const value = cambio.value ?? {};
        const mensajes: WhatsappMensaje[] = value.messages ?? [];
        const contacto: WhatsappContacto | undefined = value.contacts?.[0];

        for (const msg of mensajes) {
          await procesarMensajeEntrante(msg, contacto);
        }
      }
    }
  } catch (error) {
    // Meta reintenta si no devolvemos 200 rápido — logueamos pero
    // igual respondemos 200 para no entrar en un loop de reintentos.
    console.error("[webhook whatsapp] error procesando payload:", error);
  }

  return NextResponse.json({ ok: true });
}

function verificarFirma(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) {
    console.warn(
      "[webhook whatsapp] WHATSAPP_APP_SECRET no configurado — firma sin verificar. OK en dev, NO dejar así en producción."
    );
    return true;
  }

  const header = req.headers.get("x-hub-signature-256") ?? "";
  const firmaEsperada =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const a = Buffer.from(header);
  const b = Buffer.from(firmaEsperada);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function procesarMensajeEntrante(msg: WhatsappMensaje, contacto?: WhatsappContacto) {
  // Por ahora solo procesamos texto. Audio/imagen quedan para más adelante.
  if (msg.type !== "text" || !msg.text?.body) return;

  // Idempotencia: Meta reintenta el webhook si no respondemos rápido, así
  // que un mismo wamid puede llegar más de una vez.
  const yaExiste = await prisma.mensaje.findUnique({ where: { waMessageId: msg.id } });
  if (yaExiste) return;

  const telefono = msg.from;

  const cliente = await prisma.cliente.upsert({
    where: { telefono },
    update: {},
    create: { telefono, nombre: contacto?.profile?.name ?? telefono },
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
        subtitulo: msg.text.body.slice(0, 80),
        estado: EstadoVehiculo.EN_COLA,
      },
    });
  }

  await prisma.mensaje.create({
    data: {
      conversacionId: conversacion.id,
      autor: AutorMensaje.CLIENTE,
      texto: msg.text.body,
      waMessageId: msg.id,
    },
  });

  await prisma.conversacion.update({
    where: { id: conversacion.id },
    data: { updatedAt: new Date() },
  });

  // TODO (roadmap punto 4 en pitstop-ai-context.md): acá se dispara el motor
  // de diagnóstico contra el historial de mensajes de `conversacion`. Cuando
  // devuelva hipótesis/herramientas, crear el PreOT (POST /api/preot) y
  // avisarle al cliente con enviarMensajeWhatsapp(telefono, "...").
}
