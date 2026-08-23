import { Led } from "@/components/ui";
import type { RolTecnico } from "@/generated/prisma/client";

const ROL_LABEL: Record<RolTecnico, string> = {
  TECNICO: "Técnico",
  SUPERVISOR: "Supervisor",
  ADMIN: "Administrador",
};

interface TopbarProps {
  nombre: string;
  iniciales: string;
  rol: RolTecnico;
  tallerNombre: string;
}

export function Topbar({ nombre, iniciales, rol, tallerNombre }: TopbarProps) {
  return (
    <header className="h-[60px] border-b border-line flex items-center px-[22px] gap-4 bg-graphite-900 flex-none">
      <div className="flex items-center gap-2.5">
        <Led color="green" />
        <span className="font-mono text-[11.5px] text-text-md">{tallerNombre}</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2.5">
        <div className="text-right leading-tight">
          <div className="text-xs text-text-hi">{nombre}</div>
          <div className="font-mono text-[10px] text-text-lo uppercase tracking-[.08em]">
            {ROL_LABEL[rol]}
          </div>
        </div>
        <div
          className="w-[30px] h-[30px] bg-steel-700 border border-line flex items-center justify-center font-display text-xs text-text-hi clip-cut-sm"
          aria-label={`Técnico: ${nombre}`}
        >
          {iniciales}
        </div>
      </div>
    </header>
  );
}
