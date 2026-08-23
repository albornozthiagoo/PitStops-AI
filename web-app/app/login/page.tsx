"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, FieldLabel, HexLogo, Input, Led, ScanLine } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [legajo, setLegajo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const resultado = await signIn("credentials", {
      legajo,
      password,
      redirect: false,
    });

    setCargando(false);

    // Mensaje genérico a propósito para credenciales inválidas: no
    // distinguimos "el usuario no existe" de "la contraseña está mal" para
    // no facilitar user enumeration. El rate limit sí se distingue (no es
    // información sensible) para que el técnico entienda qué está pasando.
    if (!resultado || resultado.error) {
      setError(
        resultado?.code === "demasiados_intentos"
          ? "Demasiados intentos. Esperá unos minutos y volvé a intentar."
          : "Usuario o contraseña incorrectos."
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
            <Input
              id="f-user"
              name="legajo"
              type="text"
              placeholder="tecnico.garcia"
              value={legajo}
              onChange={(e) => setLegajo(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="mb-2">
            <FieldLabel htmlFor="f-pass">Contraseña</FieldLabel>
            <Input
              id="f-pass"
              name="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 mb-3" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-between items-center my-1.5 mb-5">
            <label className="flex items-center gap-1.5 text-xs text-text-lo">
              <input type="checkbox" className="accent-action-orange" /> Mantener sesión
            </label>
            <a href="#" className="text-xs text-titanium-300 hover:text-text-hi">
              Recuperar acceso
            </a>
          </div>

          <Button type="submit" variant="primary" className="w-full justify-center" disabled={cargando}>
            {cargando ? "Ingresando…" : "Iniciar sesión"}
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
