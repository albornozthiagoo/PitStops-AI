// Helper para enviar mensajes salientes por WhatsApp Cloud API (Meta).
// El webhook (app/api/webhooks/whatsapp) lo va a usar para responder al
// cliente cuando el motor de diagnóstico termine (ver roadmap punto 4 en
// pitstop-ai-context.md), y a futuro también sirve para que un técnico
// responda manualmente desde el dashboard.

const WHATSAPP_API_VERSION = "v21.0";

export async function enviarMensajeWhatsapp(to: string, texto: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error("Faltan WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID en el entorno");
  }

  const res = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: texto },
      }),
    }
  );

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Error enviando mensaje de WhatsApp (${res.status}): ${detalle}`);
  }
}
