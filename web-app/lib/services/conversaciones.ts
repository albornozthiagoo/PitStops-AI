import { prisma } from "@/lib/prisma";
import { formatFechaHora } from "@/lib/date";

// Shape plano (sin Date ni tipos del cliente de Prisma) para poder pasarlo
// sin problemas de Server Component a Client Component — ver la nota en
// historial.ts sobre por qué evitamos esto.
export interface ConversacionListItem {
  id: string;
  titulo: string;
  subtitulo: string;
  estado: string;
  controladoPor: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  vehiculoPatente: string | null;
  ultimoMensaje: string | null;
  actualizado: string;
}

export interface ConversacionMensaje {
  id: string;
  autor: string;
  texto: string;
  fecha: string;
}

export interface ConversacionDetalle {
  id: string;
  titulo: string;
  subtitulo: string;
  estado: string;
  controladoPor: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  vehiculoPatente: string | null;
  vehiculoModelo: string | null;
  mensajes: ConversacionMensaje[];
}

export async function getConversaciones(): Promise<ConversacionListItem[]> {
  const conversaciones = await prisma.conversacion.findMany({
    include: {
      cliente: true,
      vehiculo: true,
      mensajes: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return conversaciones.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    subtitulo: c.subtitulo,
    estado: c.estado,
    controladoPor: c.controladoPor,
    clienteNombre: c.cliente.nombre,
    clienteTelefono: c.cliente.telefono,
    vehiculoPatente: c.vehiculo?.patente ?? null,
    ultimoMensaje: c.mensajes[0]?.texto ?? null,
    actualizado: formatFechaHora(c.updatedAt),
  }));
}

export async function getConversacion(id: string): Promise<ConversacionDetalle | null> {
  const c = await prisma.conversacion.findUnique({
    where: { id },
    include: {
      cliente: true,
      vehiculo: true,
      mensajes: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!c) return null;

  return {
    id: c.id,
    titulo: c.titulo,
    subtitulo: c.subtitulo,
    estado: c.estado,
    controladoPor: c.controladoPor,
    clienteNombre: c.cliente.nombre,
    clienteTelefono: c.cliente.telefono,
    vehiculoPatente: c.vehiculo?.patente ?? null,
    vehiculoModelo: c.vehiculo?.modelo ?? null,
    mensajes: c.mensajes.map((m) => ({
      id: m.id,
      autor: m.autor,
      texto: m.texto,
      fecha: formatFechaHora(m.createdAt),
    })),
  };
}
