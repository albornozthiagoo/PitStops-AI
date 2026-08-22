// Helpers para hablar con la Bot API de Telegram. El webhook
// (app/api/webhooks/telegram) los usa para responder al cliente con la
// respuesta del motor de diagnóstico, y para atender los botones de acción
// (sumar algo al diagnóstico / consultar por otro auto).
//
// Importante: estos botones NO se usan para las preguntas del diagnóstico
// en sí (esas son siempre texto libre — las fallas de un auto son
// demasiado variadas para un menú fijo). Son solo para las dos acciones de
// navegación que aparecen cuando se cierra un prediagnóstico.

export interface BotonTelegram {
  texto: string;
  // Valor fijo que identifica la acción (ej. "nuevo", "continuar:<id>") —
  // no es la opción elegida por el cliente, es un comando interno que el
  // webhook interpreta al recibir el click.
  datos: string;
}

function tokenBot(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Falta TELEGRAM_BOT_TOKEN en el entorno");
  }
  return token;
}

async function llamarTelegram(metodo: string, body: unknown): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${tokenBot()}/${metodo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Telegram ${metodo} falló (${res.status}): ${detalle}`);
  }
}

export async function enviarMensajeTelegram(chatId: string, texto: string, botones?: BotonTelegram[]): Promise<void> {
  const reply_markup =
    botones && botones.length > 0
      ? { inline_keyboard: botones.map((b) => [{ text: b.texto, callback_data: b.datos }]) }
      : undefined;

  await llamarTelegram("sendMessage", { chat_id: chatId, text: texto, reply_markup });
}

// Hay que confirmarle a Telegram que el click ya se procesó — si no, el
// botón se queda "girando" del lado del cliente hasta que expira solo.
export async function responderCallbackTelegram(callbackQueryId: string): Promise<void> {
  await llamarTelegram("answerCallbackQuery", { callback_query_id: callbackQueryId });
}

// Saca los botones del mensaje una vez contestado, para que no quede la
// tentación de tocar una acción vieja.
export async function quitarBotonesTelegram(chatId: string, messageId: number): Promise<void> {
  try {
    await llamarTelegram("editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    });
  } catch (error) {
    console.error("[telegram] no se pudieron quitar los botones:", error);
  }
}
