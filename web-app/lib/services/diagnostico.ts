import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AutorMensaje, EstadoVehiculo, Prioridad } from "@/generated/prisma/client";
import { generarSiguientePaso, type VehiculoInfo } from "@/lib/services/llm";

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

// Corre un turno del motor de diagnóstico para una conversación: lee su
// historial completo, le pregunta al LLM qué sigue, y persiste el
// resultado (una pregunta nueva, o el cierre con el PreOT armado). Siempre
// devuelve el texto que hay que mandarle al cliente por el canal activo.
export async function correrTurnoDiagnostico(conversacionId: string): Promise<string> {
  const conversacion = await prisma.conversacion.findUniqueOrThrow({
    where: { id: conversacionId },
    include: { mensajes: { orderBy: { createdAt: "asc" } } },
  });

  const paso = await generarSiguientePaso(
    conversacion.mensajes.map((m) => ({ autor: m.autor, texto: m.texto, tag: m.tag }))
  );

  if (paso.tipo === "pregunta") {
    await prisma.mensaje.create({
      data: {
        conversacionId,
        autor: AutorMensaje.SISTEMA,
        texto: paso.texto,
        // El marcador (si hay) es para trackear guardrails internos de
        // generarSiguientePaso (ver lib/services/llm.ts) — nunca es texto
        // pensado para mostrarse.
        tag: paso.marcador ?? "PitStop AI",
      },
    });
    return paso.texto;
  }

  const vehiculoId = await resolverVehiculo(conversacion, paso.vehiculo, paso.sintomaPrincipal);
  const codigo = `PRE-OT #${Math.floor(1000 + Math.random() * 9000)}`;

  await prisma.$transaction([
    prisma.preOT.create({
      data: {
        codigo,
        vehiculoId,
        conversacionId,
        prioridad: normalizarPrioridad(paso.prioridad),
        sintomaPrincipal: paso.sintomaPrincipal,
        tiempoEstimado: paso.tiempoEstimado,
        hipotesis: { create: paso.hipotesis },
        herramientas: { create: paso.herramientas.map((nombre) => ({ nombre })) },
      },
    }),
    prisma.conversacion.update({
      where: { id: conversacionId },
      data: { estado: EstadoVehiculo.COMPLETADO },
    }),
    // El nombre que da el cliente en el chat es más confiable que el nombre
    // de perfil de Telegram (puede ser un apodo o el de otra persona).
    prisma.cliente.update({
      where: { id: conversacion.clienteId },
      data: { nombre: paso.nombreCliente },
    }),
  ]);

  // El dashboard cuenta "conversaciones activas" y "vehículos en
  // diagnóstico" — recién cambiaron ambas cosas, así que le avisamos a
  // Next que esa página no puede seguir sirviendo la versión vieja.
  revalidatePath("/dashboard");
  revalidatePath(`/preot/${vehiculoId}`);

  const cierre = `Listo, ya armamos tu prediagnóstico (${codigo}). Un técnico del taller lo va a revisar y te contacta a la brevedad. ¡Gracias por escribirnos a PitStop AI!`;
  await prisma.mensaje.create({
    data: { conversacionId, autor: AutorMensaje.SISTEMA, texto: cierre, tag: "PitStop AI" },
  });
  return cierre;
}
