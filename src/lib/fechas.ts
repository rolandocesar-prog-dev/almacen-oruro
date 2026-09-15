// Fechas en la zona horaria de Oruro (research R-12).
//
// El servidor puede estar configurado en UTC. Si "hoy" se calculara en UTC, algo registrado a las
// 21:00 en Oruro quedaría con la fecha del día siguiente. Por eso todo "hoy" y "mes en curso"
// se calcula en America/La_Paz (UTC−4, sin horario de verano).

export const ZONA_HORARIA = "America/La_Paz";

// "en-CA" da el formato AAAA-MM-DD directamente.
const formatoFecha = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha (AAAA-MM-DD) que corresponde a un momento en La Paz. */
export function fechaEnLaPaz(momento: Date): string {
  return formatoFecha.format(momento);
}

/** Fecha de hoy en La Paz, en formato AAAA-MM-DD. */
export function hoyEnLaPaz(ahora: Date = new Date()): string {
  return fechaEnLaPaz(ahora);
}

/** Primer día del mes en curso en La Paz, en formato AAAA-MM-DD. */
export function inicioDelMesEnCurso(ahora: Date = new Date()): string {
  return `${hoyEnLaPaz(ahora).slice(0, 8)}01`;
}

/** Suma horas a un momento. */
export function sumarHoras(fecha: Date, horas: number): Date {
  return new Date(fecha.getTime() + horas * 60 * 60 * 1000);
}

/**
 * Momento en que empieza un día de La Paz (00:00 hora local), para filtrar por rango de fechas.
 * Bolivia no tiene horario de verano: la diferencia con UTC es siempre −4 horas.
 */
export function inicioDelDiaEnLaPaz(fecha: string): Date {
  return new Date(`${fecha}T00:00:00-04:00`);
}

/** Momento en que empieza el día siguiente en La Paz: límite superior exclusivo de un rango. */
export function inicioDelDiaSiguienteEnLaPaz(fecha: string): Date {
  return sumarHoras(inicioDelDiaEnLaPaz(fecha), 24);
}

/** ¿El texto es una fecha válida con formato AAAA-MM-DD? */
export function esFechaValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto);
}

/**
 * Fecha de un documento para mostrar: "2026-09-10" → "10/09/2026". Se arma con el texto, sin pasar por
 * zonas horarias, porque una fecha de documento no tiene hora (research K-06 de F-003).
 */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

const formatoFechaHora = new Intl.DateTimeFormat("es-BO", {
  timeZone: ZONA_HORARIA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Fecha y hora para mostrar en pantalla, en hora de Bolivia (ej. 13/09/2026 21:05). */
export function formatearFechaHora(momento: Date): string {
  return formatoFechaHora.format(momento).replace(",", "");
}
