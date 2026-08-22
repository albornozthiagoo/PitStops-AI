"use client";

import { useState } from "react";
import { Button, Panel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatFechaHora } from "@/lib/date";

// Nota: usamos literales de string ("IA" | "TECNICO", etc.) en vez de
// importar los enums desde @/generated/prisma/client acá. Este es un
// componente "use client" y ese módulo trae código de servidor (conexión
// a la base) que Turbopack no puede empaquetar para el navegador — el
// mismo bug que rompía /historial. Los valores que llegan como prop ya
// son strings planos, así que no hace falta el import.
export interface ThreadMensaje {
  id: string;
  autor: string; // "TECNICO" | "CLIENTE" | "SISTEMA"
  texto: string;
  fecha: string;
}

interface Props {
  conversacionId: string;
  controladoPorInicial: string; // "IA" | "TECNICO"
  mensajesIniciales: ThreadMensaje[];
}

export function ConversacionThread({ conversacionId, controladoPorInicial, mensajesIniciales }: Props) {
  const [controladoPor, setControladoPor] = useState(controladoPorInicial);
  const [mensajes, setMensajes] = useState(mensajesIniciales);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cambiandoControl, setCambiandoControl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esControlTecnico = controladoPor === "TECNICO";

  async function alternarControl() {
    setCambiandoControl(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversaciones/${conversacionId}/control`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: esControlTecnico ? "liberar" : "tomar" }),
      });
      if (!res.ok) throw new Error("No se pudo cambiar el control de la conversación");
      const data = await res.json();
      setControladoPor(data.controladoPor);
    } catch {
      setError("No se pudo cambiar el control. Probá de nuevo.");
    } finally {
      setCambiandoControl(false);
    }
  }

  async function enviarMensaje() {
    const textoLimpio = texto.trim();
    if (!textoLimpio || enviando) return;

    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversaciones/${conversacionId}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: textoLimpio }),
      });
      if (!res.ok) throw new Error("No se pudo enviar el mensaje");
      const data = await res.json();

      setMensajes((prev) => [
        ...prev,
        {
          id: data.id,
          autor: "TECNICO",
          texto: data.texto,
          fecha: formatFechaHora(new Date(data.createdAt)),
        },
      ]);
      setControladoPor("TECNICO");
      setTexto("");
      if (data.avisoEnvio) setError(data.avisoEnvio);
    } catch {
      setError("No se pudo enviar el mensaje. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Panel size="lg" className="max-w-[820px] mx-auto flex flex-col">
      <div className="flex justify-between items-center px-6 py-4 border-b border-line">
        <div>
          <span className="font-mono text-[10px] tracking-[.12em] uppercase text-titanium-300 block mb-1">
            Control de la conversación
          </span>
          <span
            className={cn(
              "font-mono text-[11px] font-semibold uppercase tracking-wide",
              esControlTecnico ? "text-[#7ee8ac]" : "text-action-orange"
            )}
          >
            {esControlTecnico ? "● Técnico al mando" : "● IA respondiendo"}
          </span>
        </div>
        <Button
          variant={esControlTecnico ? "secondary" : "primary"}
          size="sm"
          onClick={alternarControl}
          disabled={cambiandoControl}
        >
          {cambiandoControl ? "..." : esControlTecnico ? "Liberar a la IA" : "Tomar conversación"}
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-3 max-h-[420px]">
        {mensajes.length === 0 ? (
          <p className="text-text-lo text-sm">Todavía no hay mensajes en esta conversación.</p>
        ) : (
          mensajes.map((m) => <MensajeBubble key={m.id} mensaje={m} />)
        )}
      </div>

      <div className="px-6 py-4 border-t border-line">
        {error && <p className="text-[#ff8a85] text-xs mb-2">{error}</p>}
        {!esControlTecnico ? (
          <p className="text-text-lo text-xs">
            Tomá la conversación para poder responderle manualmente al cliente.
          </p>
        ) : (
          <div className="flex gap-2.5">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviarMensaje();
                }
              }}
              placeholder="Escribí tu respuesta al cliente…"
              rows={2}
              className="flex-1 bg-graphite-950 border border-line text-text-hi px-3 py-[11px] text-sm clip-cut-sm placeholder:text-text-lo focus:border-action-orange focus:shadow-[0_0_0_3px_rgba(255,106,0,.15)] focus:outline-none transition-colors resize-none"
            />
            <Button onClick={enviarMensaje} disabled={enviando || !texto.trim()}>
              {enviando ? "Enviando…" : "Enviar"}
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}

function MensajeBubble({ mensaje }: { mensaje: ThreadMensaje }) {
  const esCliente = mensaje.autor === "CLIENTE";
  const esSistema = mensaje.autor === "SISTEMA";

  return (
    <div className={cn("flex", esCliente ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[75%] px-3.5 py-2.5 text-[13px] clip-cut-sm border",
          esCliente
            ? "bg-steel-800 border-line text-text-hi"
            : esSistema
            ? "bg-action-orange/10 border-action-orange/35 text-text-hi"
            : "bg-graphite-950 border-line text-text-hi"
        )}
      >
        <div className="font-mono text-[9.5px] tracking-wide uppercase text-text-lo mb-1">
          {esCliente ? "Cliente" : esSistema ? "PitStops AI" : "Técnico"} · {mensaje.fecha}
        </div>
        {mensaje.texto}
      </div>
    </div>
  );
}
