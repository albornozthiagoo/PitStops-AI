// Helper para enviar mensajes salientes por WhatsApp vía Twilio (Sandbox).
// El webhook (app/api/webhooks/whatsapp) lo va a usar para responder al
// cliente cuando el motor de diagnóstico termine (ver roadmap punto 4 en
// claude.md), y a futuro también sirve para que un técnico responda
// manualmente desde el dashboard.

import twilio from "twilio";

export async function enviarMensajeWhatsapp(to: string, texto: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error(
      "Faltan TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_NUMBER en el entorno"
    );
  }

  const client = twilio(accountSid, authToken);

  await client.messages.create({
    from,
    to: normalizarNumeroWhatsapp(to),
    body: texto,
  });
}

// Twilio identifica a los participantes con el prefijo "whatsapp:" delante
// del número en formato E.164 (ej. "whatsapp:+5491122334455").
function normalizarNumeroWhatsapp(numero: string): string {
  return numero.startsWith("whatsapp:") ? numero : `whatsapp:${numero}`;
}
