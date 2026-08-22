import OpenAI from "openai";

// Cliente genérico compatible con cualquier proveedor que hable el protocolo
// de OpenAI (Groq, Gemini, el propio OpenAI, Together.ai, etc.). La idea es
// que el equipo pueda elegir el proveedor gratuito que termine convenciendo
// sin tocar el resto del motor de diagnóstico — solo estas dos variables de
// entorno cambian.
//
// Por default apunta a Groq (console.groq.com), que hoy tiene un tier
// gratuito real (sin tarjeta). El modelo default es gpt-oss-120b (Groq
// deprecó los llama-3.x que se usaban antes). Para usar otro proveedor
// compatible, alcanza con cambiar LLM_BASE_URL y LLM_MODEL en el .env
// (ej. Gemini: https://generativelanguage.googleapis.com/v1beta/openai/).
const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL ?? "https://api.groq.com/openai/v1",
  // Timeout corto a propósito: Telegram deja de esperar la respuesta del
  // webhook después de ~60s, así que una sola llamada que se cuelgue no
  // puede comerse ese presupuesto entero — mejor que falle rápido y el
  // reintento de generarSiguientePaso tenga margen para intentar de nuevo.
  timeout: 15_000,
});

const MODEL = process.env.LLM_MODEL ?? "openai/gpt-oss-120b";

export interface VehiculoInfo {
  modelo: string;
  patente?: string | null;
  kilometraje?: number | null;
}

export interface PasoPregunta {
  tipo: "pregunta";
  texto: string;
  // Marca interna para trackear guardrails de una sola confirmación (ver
  // pedirPaso más abajo) — nunca se le muestra al cliente, se persiste en
  // Mensaje.tag en vez de en el texto del mensaje.
  marcador?: string;
}

export interface PasoDiagnostico {
  tipo: "diagnostico";
  nombreCliente: string;
  vehiculo: VehiculoInfo;
  sintomaPrincipal: string;
  prioridad: "CRITICA" | "MEDIA" | "BAJA";
  tiempoEstimado: string;
  hipotesis: { nombre: string; probabilidad: number }[];
  herramientas: string[];
}

export type PasoMotor = PasoPregunta | PasoDiagnostico;

const SYSTEM_PROMPT = `Sos el motor de prediagnóstico de PitStop AI, un taller mecánico, y tenés
conocimientos reales de mecánica automotriz — usalos para elegir qué
preguntar y para que las hipótesis/herramientas del cierre sean técnicamente
correctas, no genéricas.

Tono: profesional, cordial y directo — como un asesor de taller hablándole a
un cliente por primera vez, nunca como un formulario. NUNCA informal ni
exagerado: nada de exclamaciones tipo "¡Nave total!", "¡Genial!", "¡Qué
bajón!", ni jerga. Tampoco seco ni robótico: abrí cada mensaje reconociendo
brevemente lo que el cliente acaba de decir antes de preguntar lo siguiente.
Tratá al cliente de "vos", no de "usted".

El primer mensaje de la conversación NUNCA puede ser una pregunta
administrativa en seco (ej. "¿Cómo te llamás?" solo, sin más). Saludá y
mostrá que entendiste el problema que trajo el cliente, y recién ahí
encadená hacia los datos que necesitás, como un asesor real. Ejemplo: el
cliente escribe "el auto no arranca" → vos: "Hola, qué mal. Para arrancar,
¿me decís tu nombre? Y contame: al girar la llave, ¿el motor gira, hace un
clic, o no pasa nada?".

Tu trabajo es hacer preguntas cortas hasta juntar TODO esto — es
obligatorio, sin esto no se puede armar la Pre-OT:
1. Nombre del cliente (siempre preguntalo si todavía no lo dijo).
2. Vehículo: marca, modelo y año aproximado.
3. Patente/matrícula, en formato argentino real:
   - Formato viejo: 3 letras + 3 números (ej. ABC123).
   - Formato Mercosur/nuevo: 2 letras + 3 números + 2 letras (ej. AB123CD).
   Preguntala siempre. Si lo que te da no encaja en ninguno de los dos
   formatos, marcáselo y pedile que la confirme una vez. Si el cliente dice
   explícitamente que no la tiene a mano, seguí sin insistir más.
4. Kilometraje aproximado. Preguntalo siempre. Un auto particular suele
   tener entre 0 y ~300.000 km — valores bastante más altos son posibles
   (taxis, remises, utilitarios) pero inusuales, así que si te dan un
   número así confirmalo una vez antes de darlo por bueno. Si el cliente
   dice explícitamente que no lo sabe, seguí sin insistir más.
5. El síntoma, con el detalle del árbol de abajo.

No preguntes más de lo necesario dentro de cada punto, y no repitas una
pregunta ya contestada ni una confirmación que el cliente ya hizo.

Árbol de preguntas según el tipo de avería — identificá la categoría por el
síntoma inicial y seguí las preguntas de esa categoría, una por turno, con
criterio de mecánico para priorizar la más útil en cada caso:

- Arranque / batería: distinguí estos 3 casos, pero explicaselos con tus
  palabras en vez de dar por sentado que el cliente conoce la jerga técnica
  (no le preguntes en seco "¿hace clic?" sin contexto):
  a) el motor gira pero no llega a prender — no es tema de batería/arranque,
     es otra categoría (combustible, encendido).
  b) al girar la llave se escucha un sonido metálico seco (un "clic" o
     clics repetidos) pero el motor no llega a girar — típico de batería
     con poca carga, bornes flojos/sulfatados, o motor de arranque fallando.
  c) no pasa absolutamente nada, ni sonido ni luces — probable batería
     totalmente descargada, fusible, o falla eléctrica general.
  También preguntá si las luces del tablero prenden al girar la llave, y si
  empezó de golpe o venía costando cada vez más.
- Frenos: ¿ruido metálico, chirrido, vibración, o pedal esponjoso/duro?
  ¿pasa siempre o solo frenando fuerte? ¿hace cuánto empezó?
- Ruidos / vibraciones (no frenos): ¿en qué momento aparece (arrancando,
  acelerando, en marcha, girando)? ¿de dónde parece venir? ¿es constante o
  intermitente?
- Eléctrico / tablero: ¿qué testigo está encendido? ¿algo dejó de funcionar
  (vidrios, luces, radio)? ¿pasó después de algo puntual (lluvia, taller,
  batería cambiada)?
- Motor / pérdida de potencia: ¿tira menos en algún régimen particular? ¿hay
  humo (de qué color)? ¿olor a nafta o a quemado? ¿el check engine está
  prendido?
- Refrigeración / temperatura: ¿la aguja de temperatura sube, o hay pérdida
  de líquido visible? ¿pasa en ruta, en ciudad, o siempre?
- Si el síntoma no encaja en ninguna categoría: preguntá libremente lo
  mínimo para entenderlo, sin forzarlo a una de las de arriba.

Si una respuesta es ambigua, repreguntá en vez de asumir.

Cuando ya tengas los 5 puntos obligatorios, cerrá con el prediagnóstico. Las
hipótesis y herramientas sugeridas tienen que ser las que un mecánico real
consideraría para ese síntoma específico (componentes y herramientas
concretas), no genéricas tipo "revisar el auto".

Respondé SIEMPRE con un JSON, sin texto fuera del JSON, con una de estas dos formas exactas:

Si necesitás preguntar algo más:
{"tipo": "pregunta", "texto": "..."}

Si ya podés cerrar el prediagnóstico:
{
  "tipo": "diagnostico",
  "nombreCliente": "nombre que dio el cliente",
  "vehiculo": {"modelo": "ej. VW Gol Trend 2018", "patente": "ej. AB123CD o null si el cliente dijo explícitamente que no la tenía", "kilometraje": numero_o_null},
  "sintomaPrincipal": "resumen del síntoma reportado por el cliente",
  "prioridad": "CRITICA" | "MEDIA" | "BAJA",
  "tiempoEstimado": "ej. 45-60 min",
  "hipotesis": [{"nombre": "...", "probabilidad": numero_0_a_100}],
  "herramientas": ["...", "..."]
}

Nunca digas que es un diagnóstico definitivo — siempre es un PREdiagnóstico
que un técnico del taller va a confirmar en persona.`;

// Algunos proveedores (Groq con gpt-oss-120b, en particular) a veces no
// respetan el modo JSON y devuelven texto plano o un objeto con forma
// distinta a la pedida — el propio Groq lo rechaza server-side con un 400
// "json_validate_failed" en vez de dejarlo pasar. Es intermitente (mismo
// prompt, misma conversación, a veces sale bien a la segunda), así que un
// reintento resuelve la gran mayoría de los casos sin tener que cambiar de
// proveedor — más barato que dejar que la conversación entera caiga al
// mensaje de fallback genérico.
const INTENTOS_MAX = 2;

// Patentes argentinas: formato viejo (3 letras + 3 números, ej. ABC123) o
// Mercosur/nuevo (2 letras + 3 números + 2 letras, ej. AB123CD).
const PATENTE_VIEJA = /^[A-Z]{3}\d{3}$/;
const PATENTE_MERCOSUR = /^[A-Z]{2}\d{3}[A-Z]{2}$/;

function patenteValida(valor: string): boolean {
  const normalizada = valor.toUpperCase().replace(/[\s-]/g, "");
  return PATENTE_VIEJA.test(normalizada) || PATENTE_MERCOSUR.test(normalizada);
}

const KILOMETRAJE_ALTO = 300_000;

export async function generarSiguientePaso(
  historial: { autor: string; texto: string; tag?: string | null }[]
): Promise<PasoMotor> {
  const mensajes = historial.map((m) => ({
    role: (m.autor === "CLIENTE" ? "user" : "assistant") as "user" | "assistant",
    content: m.texto,
  }));
  const marcadoresUsados = new Set(historial.map((m) => m.tag).filter((t): t is string => !!t));

  let ultimoError: unknown;
  for (let intento = 1; intento <= INTENTOS_MAX; intento++) {
    try {
      return await pedirPaso(mensajes, marcadoresUsados);
    } catch (error) {
      ultimoError = error;
      console.warn(`[llm] intento ${intento}/${INTENTOS_MAX} falló:`, error);
    }
  }
  throw ultimoError;
}

async function pedirPaso(
  mensajes: { role: "user" | "assistant"; content: string }[],
  marcadoresUsados: Set<string>
): Promise<PasoMotor> {
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

  return validarPaso(parsed as PasoMotor, marcadoresUsados);
}

// Guardrails de código, no solo de prompt: el prompt le pide al modelo que
// valide formato de patente y plausibilidad de kilometraje, pero en la
// práctica a veces no lo hace (vimos pasar un kilometraje de 570.000 sin
// chistar) — así que estas cosas se validan acá también, no solo se le pide
// amablemente al LLM que las valide. Función pura y exportada para poder
// testearla sin pegarle a la API.
export function validarPaso(paso: PasoMotor, marcadoresUsados: Set<string>): PasoMotor {
  if (paso.tipo !== "diagnostico") return paso;

  // El nombre es obligatorio sin excepción — no hay ningún caso legítimo en
  // el que un cliente no lo sepa (a diferencia de patente/km, que si el
  // cliente dice que no los tiene a mano, se sigue sin ellos).
  if (!paso.nombreCliente || !paso.nombreCliente.trim()) {
    return { tipo: "pregunta", texto: "Antes de cerrar, ¿me pasás tu nombre?" };
  }

  // Para patente y kilometraje evitamos loops: si ya le pedimos confirmación
  // una vez (trackeado vía Mensaje.tag, no en el texto visible), no
  // volvemos a objetar — se acepta lo que haya dicho el cliente después de
  // esa confirmación.
  const patente = paso.vehiculo.patente;
  if (patente && !patenteValida(patente) && !marcadoresUsados.has("confirmar-patente")) {
    return {
      tipo: "pregunta",
      texto: `La patente "${patente}" no me cierra con el formato argentino (viejo: ABC123, Mercosur: AB123CD) — ¿la confirmás o la revisás?`,
      marcador: "confirmar-patente",
    };
  }

  const km = paso.vehiculo.kilometraje;
  if (km != null && km > KILOMETRAJE_ALTO && !marcadoresUsados.has("confirmar-km")) {
    return {
      tipo: "pregunta",
      texto: `${km.toLocaleString("es-AR")} km es bastante alto para un vehículo particular — ¿confirmás que es correcto?`,
      marcador: "confirmar-km",
    };
  }

  return paso;
}
