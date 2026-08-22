import Link from "next/link";
import { getConversacion } from "@/lib/services/conversaciones";
import { ConversacionThread } from "@/components/conversaciones/ConversacionThread";

// Depende de la base en cada visita — nunca prerenderizar en build time.
export const dynamic = "force-dynamic";

interface Props {
  // Next.js 15+ pasa `params` como Promise en las páginas — hay que
  // esperarlo antes de leer `.id` (si no, queda `undefined`).
  params: Promise<{ id: string }>;
}

export default async function ConversacionDetallePage({ params }: Props) {
  const { id } = await params;
  const conversacion = await getConversacion(id);

  if (!conversacion) {
    return (
      <div className="h-full flex items-center justify-center p-7">
        <p className="text-text-lo">No se encontró esa conversación.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-7">
      <div className="font-mono text-[11px] tracking-[.14em] uppercase text-action-orange mb-1.5 flex items-center gap-2">
        <Link href="/conversaciones" className="hover:text-text-hi">
          Conversaciones
        </Link>
        <span>/</span>
        <span>{conversacion.clienteNombre}</span>
      </div>
      <h2 className="text-2xl mb-1">{conversacion.titulo}</h2>
      <p className="text-text-lo text-sm mb-[18px]">
        {conversacion.subtitulo}
        {conversacion.vehiculoModelo ? ` · ${conversacion.vehiculoModelo}` : ""}
        {conversacion.clienteTelefono ? ` · ${conversacion.clienteTelefono}` : ""}
      </p>

      <ConversacionThread
        conversacionId={conversacion.id}
        controladoPorInicial={conversacion.controladoPor}
        mensajesIniciales={conversacion.mensajes}
      />
    </div>
  );
}
