// Helper para enviar mensajes salientes por Telegram (Bot API). El webhook
// (app/api/webhooks/telegram) lo usa para responder al cliente con la
// respuesta del motor de diagnóstico.

const INTENTOS_MAX = 3;

export async function enviarMensajeTelegram(chatId: string, texto: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Falta TELEGRAM_BOT_TOKEN en el entorno");
  }

  let ultimoError: unknown;
  for (let intento = 1; intento <= INTENTOS_MAX; intento++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: texto }),
      });

      if (!res.ok) {
        const detalle = await res.text();
        throw new Error(`Telegram sendMessage falló (${res.status}): ${detalle}`);
      }
      return;
    } catch (error) {
      ultimoError = error;
      // Vimos ECONNRESET intermitente en este entorno (red del dev, no algo
      // que dependa del código) — reintentar con un pequeño backoff resuelve
      // la mayoría de los casos. Nunca queremos que un solo hiccup de red
      // deje al cliente sin la respuesta que ya generó la IA.
      console.warn(`[telegram] intento ${intento}/${INTENTOS_MAX} de sendMessage falló:`, error);
      if (intento < INTENTOS_MAX) {
        await new Promise((r) => setTimeout(r, 500 * intento));
      }
    }
  }
  throw ultimoError;
}
