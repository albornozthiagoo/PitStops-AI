"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Led } from "@/components/ui";
import { ChatBubble, ThinkingIndicator } from "@/components/chat/ChatBubble";
import { conversaciones, vehiculos } from "@/lib/mock-data";
import { cn } from "@/lib/cn";

const LED_BY_ESTADO = { diagnosticando: "red", en_cola: "orange", completado: "green" } as const;

export default function ChatPage() {
  const [activeId, setActiveId] = useState(conversaciones[0].id);
  const active = conversaciones.find((c) => c.id === activeId)!;
  const vehiculo = vehiculos.find((v) => v.id === active.vehiculoId)!;

  return (
    <div className="flex h-full">
      {/* Lista de conversaciones */}
      <aside className="w-[270px] border-r border-line flex-none overflow-y-auto bg-graphite-900">
        <div className="px-4 py-3.5 border-b border-line">
          <span className="font-mono text-[11px] tracking-[.14em] uppercase text-action-orange">
            Conversaciones
          </span>
        </div>
        {conversaciones.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={cn(
              "w-full text-left px-4 py-3.5 border-b border-line-soft transition-colors",
              c.id === activeId ? "bg-steel-800 border-l-2 border-l-action-orange" : "hover:bg-steel-800"
            )}
          >
            <div className="flex justify-between">
              <strong className="text-text-hi text-[13px]">{c.titulo}</strong>
              <Led color={LED_BY_ESTADO[c.estado]} />
            </div>
            <div className="font-mono text-[11px] text-text-lo mt-1">{c.subtitulo}</div>
          </button>
        ))}
      </aside>

      {/* Ventana de chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-3 border-b border-line flex justify-between items-center bg-graphite-900">
          <div>
            <strong className="text-text-hi">{vehiculo.modelo}</strong>{" "}
            <span className="font-mono text-text-lo text-[11px]">
              · {vehiculo.patente} · {vehiculo.bahia}
            </span>
          </div>
          <Link href="/preot">
            <Button variant="primary" size="sm">
              Generar Pre-OT
            </Button>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-[30px] py-[26px] flex flex-col gap-4">
          {active.mensajes.map((m) => (
            <ChatBubble key={m.id} mensaje={m} />
          ))}
          {active.estado === "diagnosticando" && <ThinkingIndicator />}
        </div>

        <div className="border-t border-line px-6 py-4 flex gap-2.5 items-center bg-graphite-900">
          <Input placeholder="Escribí el síntoma o respuesta del cliente…" className="flex-1" />
          <Button variant="secondary" size="sm">
            Adjuntar
          </Button>
          <Button variant="primary" size="sm">
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
