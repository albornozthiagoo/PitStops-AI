"use client";

import { useRouter } from "next/navigation";
import { Button, FieldLabel, HexLogo, Input, Led, ScanLine } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: reemplazar por autenticación real (NextAuth / Clerk / etc.)
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_-10%,#1b1e21,#0a0b0d_60%)]">
      <div className="absolute inset-0 hex-texture pointer-events-none" aria-hidden="true" />

      <div className="w-[400px] relative border border-line bg-graphite-900 px-[34px] pt-[38px] pb-[30px] clip-cut-lg rivets">
        <ScanLine />

        <div className="flex items-center gap-3 mb-7">
          <HexLogo size={48} />
          <div>
            <h1 className="text-[19px]">
              PITSTOPS <span className="text-action-orange">AI</span>
            </h1>
            <div className="font-mono text-[10px] tracking-[.14em] text-text-lo uppercase">
              Sistema de prediagnóstico
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <FieldLabel htmlFor="f-user">Usuario / legajo</FieldLabel>
            <Input id="f-user" type="text" placeholder="tecnico.garcia" required />
          </div>

          <div className="mb-2">
            <FieldLabel htmlFor="f-pass">Contraseña</FieldLabel>
            <Input id="f-pass" type="password" placeholder="••••••••" required />
          </div>

          <div className="flex justify-between items-center my-1.5 mb-5">
            <label className="flex items-center gap-1.5 text-xs text-text-lo">
              <input type="checkbox" className="accent-action-orange" /> Mantener sesión
            </label>
            <a href="#" className="text-xs text-titanium-300 hover:text-text-hi">
              Recuperar acceso
            </a>
          </div>

          <Button type="submit" variant="primary" className="w-full justify-center">
            Iniciar sesión
          </Button>
        </form>

        <div className="mt-[22px] flex justify-between items-center font-mono text-[11px] text-text-lo border-t border-line-soft pt-3.5">
          <span>PitStops AI v2.4.1</span>
          <span className="flex items-center gap-1.5">
            <Led color="green" />
            Sistema en línea
          </span>
        </div>
      </div>
    </div>
  );
}
