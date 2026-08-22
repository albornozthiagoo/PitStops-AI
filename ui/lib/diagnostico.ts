// Motor conversacional (roadmap punto 4 en claude.md). Dado el historial de
// una Conversacion, decide la siguiente pregunta a hacerle al cliente o, si
// ya hay info suficiente (vehículo, síntoma, contexto, urgencia), cierra el
// interrogatorio. Nunca debe dejar al cliente sin respuesta: si Gemini falla,
// degradamos a un mensaje genérico en vez de propagar el error.

import { prisma } from "@/lib/prisma";
import { gemini } from "@/lib/gemini";
import { AutorMensaje } from "@/generated/prisma/client";

const MODEL = "gemini-3.6-flash";

const RESPUESTA_FALLBACK =
  "Gracias por el mensaje. En breve te responde el taller para seguir con el diagnóstico.";

const SYSTEM_PROMPT = `Sos el asistente de prediagnóstico de un taller mecánico y le hablás al
cliente por WhatsApp. Tu trabajo es juntar, con preguntas cortas y dirigidas
(una por mensaje), estos datos:
- Vehículo (marca, modelo, año aproximado).
- Síntoma principal.
- Contexto: cuándo pasa, hace cuánto que pasa, si es constante o intermitente.
- Urgencia percibida por el cliente (¿puede seguir manejando o no?).

Reglas:
- Nunca dés un diagnóstico definitivo ni asegures la causa del problema — sos
  un prediagnóstico, eso lo confirma el mecánico.
- Si una respuesta es ambigua o incompleta, repreguntá en vez de asumir.
- Tono cordial, breve, en español rioplatense, como un mensaje de WhatsApp
  (sin firmas ni saludos largos).
- Cuando ya tengas los cuatro datos, no seguís preguntando: se lo confirmás
  al cliente y le avisás que un técnico va a seguir con el caso.

Respondé SIEMPRE con un JSON de la forma {"mensaje": string, "listo": boolean}.
"mensaje" es el texto exacto que se le manda al cliente por WhatsApp.
"listo" es true solo cuando ya cerraste el interrogatorio (tenés los cuatro
datos y se lo confirmaste al cliente), false mientras seguís preguntando.`;

export async function generarRespuestaDiagnostico(
  conversacionId: string
): Promise<{ texto: string; listo: boolean }> {
  try {
    const mensajes = await prisma.mensaje.findMany({
      where: { conversacionId, autor: { in: [AutorMensaje.CLIENTE, AutorMensaje.SISTEMA] } },
      orderBy: { createdAt: "asc" },
    });

    const historial = mensajes.map((m) => ({
      role: m.autor === AutorMensaje.CLIENTE ? ("user" as const) : ("assistant" as const),
      content: m.texto,
    }));

    const completion = await gemini.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...historial],
    });

    const contenido = completion.choices[0]?.message?.content;
    if (!contenido) throw new Error("Gemini no devolvió contenido");

    const parsed = JSON.parse(contenido) as { mensaje?: unknown; listo?: unknown };
    if (typeof parsed.mensaje !== "string" || typeof parsed.listo !== "boolean") {
      throw new Error("JSON de Gemini con forma inesperada");
    }

    return { texto: parsed.mensaje, listo: parsed.listo };
  } catch (error) {
    console.error("[diagnostico] fallback por error del motor conversacional:", error);
    return { texto: RESPUESTA_FALLBACK, listo: false };
  }
}
