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
 * Fecha de un documento ("AAAA-MM-DD") para una columna `date` de la base. Se crea a medianoche UTC:
 * la columna no guarda hora y así la fecha no se corre un día al convertirla (research K-06 de F-003).
 */
export function aFechaDocumento(fecha: string): Date {
  return new Date(`${fecha}T00:00:00Z`);
}

/** Fecha leída de una columna `date` como texto "AAAA-MM-DD". */
export function textoDeFechaDocumento(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
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

// ---------------------------------------------------------------------------------------------
// Meses (AAAA-MM). Los usan el pronóstico y los informes de F-007: la serie de consumo se agrupa por
// mes y el período por defecto de un informe es el mes anterior completo (FR-001, FR-010).
// ---------------------------------------------------------------------------------------------

/** Parte un mes "AAAA-MM" en sus dos números. */
function partesDelMes(mes: string): { anio: number; numero: number } {
  return { anio: Number(mes.slice(0, 4)), numero: Number(mes.slice(5, 7)) };
}

/** Arma un mes "AAAA-MM" a partir de sus dos números. */
function textoDelMes(anio: number, numero: number): string {
  return `${anio}-${String(numero).padStart(2, "0")}`;
}

/** Mes en curso en La Paz, en formato AAAA-MM. Es el mes que pronostica F-007 (FR-002). */
export function mesEnCurso(ahora: Date = new Date()): string {
  return hoyEnLaPaz(ahora).slice(0, 7);
}

/** Mes anterior a uno dado ("2026-01" → "2025-12"). */
export function mesAnterior(mes: string): string {
  const { anio, numero } = partesDelMes(mes);
  return numero === 1 ? textoDelMes(anio - 1, 12) : textoDelMes(anio, numero - 1);
}

/** Mes siguiente a uno dado ("2025-12" → "2026-01"). */
export function mesSiguiente(mes: string): string {
  const { anio, numero } = partesDelMes(mes);
  return numero === 12 ? textoDelMes(anio + 1, 1) : textoDelMes(anio, numero + 1);
}

/** Mes (AAAA-MM) de una fecha de documento leída de la base. */
export function mesDeFechaDocumento(fecha: Date): string {
  return textoDeFechaDocumento(fecha).slice(0, 7);
}

/** Primer día de un mes: "2026-08" → "2026-08-01". */
export function primerDiaDelMes(mes: string): string {
  return `${mes}-01`;
}

/**
 * Último día de un mes: "2026-08" → "2026-08-31". Se calcula pidiendo el día 0 del mes siguiente,
 * que en JavaScript es el último del mes pedido; así febrero y los años bisiestos salen solos.
 */
export function ultimoDiaDelMes(mes: string): string {
  const { anio, numero } = partesDelMes(mes);
  return new Date(Date.UTC(anio, numero, 0)).toISOString().slice(0, 10);
}

/** Mes anterior completo, el período por defecto de los informes IA (F-007, FR-010). */
export function mesAnteriorCompleto(ahora: Date = new Date()): { desde: string; hasta: string } {
  const mes = mesAnterior(mesEnCurso(ahora));
  return { desde: primerDiaDelMes(mes), hasta: ultimoDiaDelMes(mes) };
}

const NOMBRES_DE_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Mes para mostrar en pantalla: "2026-08" → "agosto de 2026". */
export function formatearMes(mes: string): string {
  const { anio, numero } = partesDelMes(mes);
  return `${NOMBRES_DE_MES[numero - 1] ?? mes} de ${anio}`;
}

/** Mes corto para el eje de un gráfico: "2026-08" → "ago 26". */
export function formatearMesCorto(mes: string): string {
  const { anio, numero } = partesDelMes(mes);
  return `${(NOMBRES_DE_MES[numero - 1] ?? mes).slice(0, 3)} ${String(anio).slice(2)}`;
}
