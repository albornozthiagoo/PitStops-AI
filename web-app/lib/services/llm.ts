import OpenAI from "openai";

// Cliente genérico compatible con cualquier proveedor que hable el protocolo
// de OpenAI (Groq, Gemini, el propio OpenAI, Together.ai, etc.). La idea es
// que el equipo pueda elegir el proveedor gratuito que termine convenciendo
// sin tocar el resto del motor de diagnóstico — solo estas dos variables de
// entorno cambian.
//
// Por default apunta a Groq (console.groq.com), que hoy tiene un tier
// gratuito real (sin tarjeta) con modelos Llama de buena calidad y rápidos.
// Para usar otro proveedor compatible, alcanza con cambiar LLM_BASE_URL y
// LLM_MODEL en el .env (ej. Gemini: https://generativelanguage.googleapis.com/v1beta/openai/).
const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL ?? "https://api.groq.com/openai/v1",
});

const MODEL = process.env.LLM_MODEL ?? "llama-3.3-70b-versatile";

export interface VehiculoInfo {
  modelo: string;
  patente?: string | null;
  kilometraje?: number | null;
}

export interface PasoPregunta {
  tipo: "pregunta";
  texto: string;
}

export interface PasoDiagnostico {
  tipo: "diagnostico";
  vehiculo: VehiculoInfo;
  sintomaPrincipal: string;
  prioridad: "CRITICA" | "MEDIA" | "BAJA";
  tiempoEstimado: string;
  hipotesis: { nombre: string; probabilidad: number }[];
  herramientas: string[];
}

export type PasoMotor = PasoPregunta | PasoDiagnostico;

const SYSTEM_PROMPT = `Sos el motor de prediagnóstico de PitStop AI, un taller mecánico.
Hablás por chat con el cliente de un taller, en español rioplatense, tono
cordial y directo. Tu trabajo es hacer preguntas cortas, una por vez, para
entender la falla del vehículo (tipo de ruido, cuándo aparece, luces de
tablero encendidas, etc.) y también para saber qué vehículo es (marca,
modelo, año y, si lo sabe, patente y kilometraje aproximado).

Nunca preguntes más de lo necesario. Si una respuesta es ambigua, repreguntá
en vez de asumir.

Cuando ya tengas información suficiente — el vehículo identificado y el
síntoma entendido — cerrá el interrogatorio con un prediagnóstico.

Respondé SIEMPRE con un JSON, sin texto fuera del JSON, con una de estas dos formas exactas:

Si necesitás preguntar algo más:
{"tipo": "pregunta", "texto": "..."}

Si ya podés cerrar el prediagnóstico:
{
  "tipo": "diagnostico",
  "vehiculo": {"modelo": "ej. VW Gol Trend 2018", "patente": "ej. AB123CD o null si no la sabe", "kilometraje": numero_o_null},
  "sintomaPrincipal": "resumen del síntoma reportado por el cliente",
  "prioridad": "CRITICA" | "MEDIA" | "BAJA",
  "tiempoEstimado": "ej. 45-60 min",
  "hipotesis": [{"nombre": "...", "probabilidad": numero_0_a_100}],
  "herramientas": ["...", "..."]
}

Nunca digas que es un diagnóstico definitivo — siempre es un PREdiagnóstico
que un técnico del taller va a confirmar en persona.`;

export async function generarSiguientePaso(
  historial: { autor: string; texto: string }[]
): Promise<PasoMotor> {
  const mensajes = historial.map((m) => ({
    role: (m.autor === "CLIENTE" ? "user" : "assistant") as "user" | "assistant",
    content: m.texto,
  }));

  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...mensajes],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("El LLM no devolvió contenido");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`El LLM devolvió algo que no es JSON válido: ${raw.slice(0, 200)}`);
  }

  const paso = parsed as { tipo?: string };
  if (paso.tipo !== "pregunta" && paso.tipo !== "diagnostico") {
    throw new Error(`Respuesta del LLM con "tipo" inesperado: ${paso.tipo}`);
  }

  return parsed as PasoMotor;
}
