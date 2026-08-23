// Rate limit simple en memoria para intentos de login, por legajo. Suficiente
// para este MVP de una sola instancia — no sobrevive un restart del proceso
// ni escala a múltiples instancias corriendo en paralelo. Si el proyecto
// crece a más de una instancia, reemplazar por algo respaldado en
// Postgres/Redis compartido.
const VENTANA_MS = 5 * 60 * 1000;
const INTENTOS_MAX = 5;

const intentos = new Map<string, number[]>();

// Limpieza perezosa: cada vez que se consulta una key vieja, se descartan
// sus timestamps fuera de ventana. Evita tener que correr un cron/interval
// aparte solo para no acumular memoria indefinidamente.
function timestampsVigentes(key: string): number[] {
  const ahora = Date.now();
  const previos = intentos.get(key) ?? [];
  const vigentes = previos.filter((t) => ahora - t < VENTANA_MS);
  if (vigentes.length > 0) {
    intentos.set(key, vigentes);
  } else {
    intentos.delete(key);
  }
  return vigentes;
}

export function excedioIntentos(key: string): boolean {
  return timestampsVigentes(key).length >= INTENTOS_MAX;
}

export function registrarIntentoFallido(key: string): void {
  const vigentes = timestampsVigentes(key);
  vigentes.push(Date.now());
  intentos.set(key, vigentes);
}

export function limpiarIntentos(key: string): void {
  intentos.delete(key);
}
