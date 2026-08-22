// Helper para enviar mensajes salientes por Telegram (Bot API). El webhook
// (app/api/webhooks/telegram) lo usa para responder al cliente con la
// respuesta del motor de diagnóstico.

export async function enviarMensajeTelegram(chatId: string, texto: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Falta TELEGRAM_BOT_TOKEN en el entorno");
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: texto }),
  });

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Telegram sendMessage falló (${res.status}): ${detalle}`);
  }
}
