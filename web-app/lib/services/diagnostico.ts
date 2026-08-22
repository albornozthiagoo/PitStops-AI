import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AutorMensaje, EstadoVehiculo, Prioridad } from "@/generated/prisma/client";
import { generarSiguientePaso, type VehiculoInfo } from "@/lib/services/llm";
import type { BotonTelegram } from "@/lib/telegram";

const PRIORIDADES_VALIDAS = new Set(Object.values(Prioridad));

function normalizarPrioridad(valor: string): Prioridad {
  return PRIORIDADES_VALIDAS.has(valor as Prioridad) ? (valor as Prioridad) : Prioridad.MEDIA;
}

// Si la conversación todavía no tiene un Vehiculo asociado, lo busca por
// patente (si el cliente la dio) o lo crea. Simplificación a propósito para
// este MVP: se asume un solo Taller cargado en la base (el del seed) — el
// día que haya más de un taller, esto necesita saber a cuál pertenece la
// conversación.
async function resolverVehiculo(
  conversacion: { id: string; clienteId: string; vehiculoId: string | null },
  info: VehiculoInfo,
  sintomaPrincipal: string
): Promise<string> {
  if (conversacion.vehiculoId) return conversacion.vehiculoId;

  if (info.patente) {
    const existente = await prisma.vehiculo.findUnique({ where: { patente: info.patente } });
    if (existente) {
      await prisma.conversacion.update({
        where: { id: conversacion.id },
        data: { vehiculoId: existente.id },
      });
      return existente.id;
    }
  }

  const taller = await prisma.taller.findFirst();
  if (!taller) {
    throw new Error("No hay ningún Taller cargado en la base — hace falta al menos uno para asociar el vehículo");
  }

  // El cliente no siempre sabe/da la patente o el VIN por chat — se
  // generan placeholders únicos para no romper los @unique del schema,
  // hasta que un técnico complete el dato real.
  const sufijo = `${conversacion.id.slice(-6)}-${Date.now()}`;
  const nuevo = await prisma.vehiculo.create({
    data: {
      patente: info.patente || `SIN-PATENTE-${sufijo}`,
      vin: `SIN-VIN-${sufijo}`,
      modelo: info.modelo,
      kilometraje: info.kilometraje ?? 0,
      sintoma: sintomaPrincipal,
      clienteId: conversacion.clienteId,
      tallerId: taller.id,
    },
  });

  await prisma.conversacion.update({
    where: { id: conversacion.id },
    data: { vehiculoId: nuevo.id },
  });

  return nuevo.id;
}

export interface RespuestaTurno {
  texto: string;
  // Botones de ACCIÓN (no de respuesta a una pregunta) — hoy solo se usan
  // al cerrar un prediagnóstico, para "sumar algo más" o "consultar por
  // otro auto". Las preguntas del diagnóstico en sí siempre son texto libre.
  botones?: BotonTelegram[];
}

// Corre un turno del motor de diagnóstico para una conversación: lee su
// historial completo, le pregunta al LLM qué sigue, y persiste el
// resultado (una pregunta nueva, o el cierre con el PreOT armado). Siempre
// devuelve el texto (y, si aplica, las opciones) que hay que mandarle al
// cliente por el canal activo.
export async function correrTurnoDiagnostico(conversacionId: string): Promise<RespuestaTurno> {
  const conversacion = await prisma.conversacion.findUniqueOrThrow({
    where: { id: conversacionId },
    include: { mensajes: { orderBy: { createdAt: "asc" } } },
  });

  const paso = await generarSiguientePaso(
    conversacion.mensajes.map((m) => ({ autor: m.autor, texto: m.texto }))
  );

  if (paso.tipo === "pregunta") {
    await prisma.mensaje.create({
      data: {
        conversacionId,
        autor: AutorMensaje.SISTEMA,
        texto: paso.texto,
        tag: "PitStop AI",
      },
    });
    return { texto: paso.texto };
  }

  const vehiculoId = await resolverVehiculo(conversacion, paso.vehiculo, paso.sintomaPrincipal);

  // Si esta conversación ya tenía una Pre-OT (se volvió a abrir porque el
  // cliente tocó "sumar algo a este diagnóstico"), la actualizamos con la
  // info nueva en vez de crear una segunda — el schema solo permite una
  // Pre-OT por conversación (conversacionId es @unique en PreOT). Si el
  // técnico ya la había aprobado, este flujo ni llega acá: el webhook la
  // reabre en una conversación nueva en ese caso (ver route.ts).
  const preOtExistente = await prisma.preOT.findUnique({ where: { conversacionId } });
  const codigo = preOtExistente?.codigo ?? `PRE-OT #${Math.floor(1000 + Math.random() * 9000)}`;

  const datosPreOt = {
    prioridad: normalizarPrioridad(paso.prioridad),
    sintomaPrincipal: paso.sintomaPrincipal,
    tiempoEstimado: paso.tiempoEstimado,
  };

  if (preOtExistente) {
    await prisma.$transaction([
      prisma.hipotesis.deleteMany({ where: { preOtId: preOtExistente.id } }),
      prisma.herramientaSugerida.deleteMany({ where: { preOtId: preOtExistente.id } }),
      prisma.preOT.update({
        where: { id: preOtExistente.id },
        data: {
          ...datosPreOt,
          hipotesis: { create: paso.hipotesis },
          herramientas: { create: paso.herramientas.map((nombre) => ({ nombre })) },
        },
      }),
      prisma.conversacion.update({
        where: { id: conversacionId },
        data: { estado: EstadoVehiculo.COMPLETADO },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.preOT.create({
        data: {
          codigo,
          vehiculoId,
          conversacionId,
          ...datosPreOt,
          hipotesis: { create: paso.hipotesis },
          herramientas: { create: paso.herramientas.map((nombre) => ({ nombre })) },
        },
      }),
      prisma.conversacion.update({
        where: { id: conversacionId },
        data: { estado: EstadoVehiculo.COMPLETADO },
      }),
    ]);
  }

  // El dashboard cuenta "conversaciones activas" y "vehículos en
  // diagnóstico" — recién cambiaron ambas cosas, así que le avisamos a
  // Next que esa página no puede seguir sirviendo la versión vieja.
  revalidatePath("/dashboard");
  revalidatePath(`/preot/${vehiculoId}`);

  const cierre = preOtExistente
    ? `Listo, actualizamos tu prediagnóstico (${codigo}) con esto que sumaste. Un técnico del taller lo va a revisar. ¡Gracias por escribirnos a PitStop AI!`
    : `Listo, ya armamos tu prediagnóstico (${codigo}). Un técnico del taller lo va a revisar y te contacta a la brevedad. ¡Gracias por escribirnos a PitStop AI!`;
  await prisma.mensaje.create({
    data: { conversacionId, autor: AutorMensaje.SISTEMA, texto: cierre, tag: "PitStop AI" },
  });

  return {
    texto: cierre,
    botones: [
      { texto: "Sumar algo a este diagnóstico", datos: `continuar:${vehiculoId}` },
      { texto: "Consultar por otro auto", datos: "nuevo" },
    ],
  };
}
