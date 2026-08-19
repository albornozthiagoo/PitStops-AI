"use client";

import { useEffect } from "react";
import { Button, Panel } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Al servidor no le llega el `error` completo por seguridad — acá en el
    // cliente sí lo tenés entero para diagnosticar en dev tools.
    console.error("[app/vehiculos] Error de renderizado:", error);
  }, [error]);

  return (
    <div className="h-full flex items-center justify-center p-7">
      <Panel className="max-w-md p-6 text-center">
        <div className="font-mono text-[10px] tracking-[.14em] uppercase text-state-red mb-2">
          Error de conexión
        </div>
        <h2 className="text-lg mb-2">No se pudieron cargar los vehículos</h2>
        <p className="text-text-lo text-sm mb-5">
          Puede ser un problema temporal de conexión con la base. Si persiste,
          avisale al equipo técnico.
          {error.digest && (
            <span className="block font-mono text-[11px] mt-2 text-text-lo">
              ref: {error.digest}
            </span>
          )}
        </p>
        <Button variant="primary" onClick={() => reset()}>
          Reintentar
        </Button>
      </Panel>
    </div>
  );
}
