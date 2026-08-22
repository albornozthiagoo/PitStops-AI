// npm run dev:quiet
//
// Corre "next dev -H localhost" pero filtra el ruido de la terminal: logs de
// "Compiled /ruta en Xms" cada vez que navegás, avisos de Fast Refresh, y el
// cartel de telemetría. Deja solo lo que importa: la URL para abrir, el
// aviso de "Ready", y cualquier error o warning real (esos nunca se filtran).
//
// El "npm run dev" normal sigue existiendo tal cual, con toda la info, por
// si alguna vez hace falta ver el detalle completo para debuggear algo.
import { spawn } from "node:child_process";
import readline from "node:readline";

const child = spawn("next", ["dev", "-H", "localhost"], {
  stdio: ["inherit", "pipe", "pipe"],
  shell: process.platform === "win32",
  // Al filtrar la salida por este pipe, Next deja de ver una terminal real y
  // apaga el color por su cuenta — forzamos FORCE_COLOR para que lo mantenga.
  env: { ...process.env, FORCE_COLOR: "1" },
});

// Líneas que se descartan porque son ruido, no información nueva.
const NOISE = [
  /^\s*-\s*Network:/i, // URL de red local (con -H localhost ya no debería salir, por las dudas)
  /Compiled .* in \d/i, // "✓ Compiled /ruta en 123ms" — uno por cada página que visitás
  /Fast Refresh/i, // avisos de hot-reload
  /Attention:/i, // cartel de telemetría de Next.js
  /Next\.js.*telemetry/i,
];

function esRuido(line) {
  if (!line.trim()) return true; // también saltea líneas en blanco, para que quede más compacto
  return NOISE.some((re) => re.test(line));
}

function pipeFiltrado(stream) {
  const rl = readline.createInterface({ input: stream });
  rl.on("line", (line) => {
    if (!esRuido(line)) console.log(line);
  });
}

pipeFiltrado(child.stdout);
pipeFiltrado(child.stderr);

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
