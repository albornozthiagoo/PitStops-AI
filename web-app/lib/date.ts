// Formateo de fecha/hora centralizado para toda la app.
//
// Antes cada archivo llamaba `fecha.toLocaleString("es-AR")` por su cuenta.
// El problema: sin especificar `hour12: false`, el formato de 12 horas queda
// a criterio del entorno donde corre (en el server de Next, según el ICU
// disponible, puede terminar mostrando "1:45" sin aclarar si es AM o PM). Acá
// lo fijamos siempre en 24 horas para que no haya ambigüedad.
//
// Es un archivo plano (sin imports de Prisma), así que lo pueden usar tanto
// Server Components como componentes "use client" sin romper Turbopack.
const OPCIONES_FECHA_HORA: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

export function formatFechaHora(fecha: Date): string {
  return fecha.toLocaleString("es-AR", OPCIONES_FECHA_HORA);
}
