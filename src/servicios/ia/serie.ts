// Serie de consumo mensual de un producto (F-007, research A-01; FR-001).
//
// El consumo sale del kardex y de ningún otro lado (constitución, principio III): son las salidas por
// distribución menos sus anulaciones. Como la anulación lleva la fecha del documento anulado (RN-53),
// una distribución entregada y luego anulada deja el mes en 0, no en negativo.
import type { TipoMovimiento } from "@/generado/prisma/client";
import { prisma } from "@/lib/prisma";
import { mesAnterior, mesDeFechaDocumento, mesEnCurso, mesSiguiente } from "@/lib/fechas";

/** Un mes de la serie: cuántas unidades se consumieron. */
export type PuntoDeSerie = { mes: string; consumo: number };
export type SerieDeConsumo = PuntoDeSerie[];

/** Los dos movimientos que forman el consumo: la salida resta y su anulación devuelve (RN-53). */
const TIPOS_DE_CONSUMO: TipoMovimiento[] = ["SALIDA_DISTRIBUCION", "ANULACION_DISTRIBUCION"];

/**
 * Arma la serie de un producto a partir de sus movimientos.
 *
 * Los movimientos de salida tienen cantidad negativa y los de anulación positiva, así que el consumo
 * del mes es `−Σ cantidad`. La serie va del mes del primer movimiento al **mes anterior al actual**,
 * con 0 en los meses sin movimientos: un mes sin consumo es información, no un hueco. El mes en curso
 * queda fuera porque todavía está incompleto y arrastraría el pronóstico hacia abajo (caso borde).
 */
function armarSerie(movimientos: { fechaDocumento: Date; cantidad: number }[], ahora: Date): SerieDeConsumo {
  if (movimientos.length === 0) return [];

  const consumoPorMes = new Map<string, number>();
  let primerMes: string | null = null;
  for (const movimiento of movimientos) {
    const mes = mesDeFechaDocumento(movimiento.fechaDocumento);
    consumoPorMes.set(mes, (consumoPorMes.get(mes) ?? 0) - movimiento.cantidad);
    if (primerMes === null || mes < primerMes) primerMes = mes;
  }

  const ultimoMes = mesAnterior(mesEnCurso(ahora));
  if (primerMes === null || primerMes > ultimoMes) return [];

  const serie: SerieDeConsumo = [];
  for (let mes = primerMes; mes <= ultimoMes; mes = mesSiguiente(mes)) {
    // Un mes no puede consumir menos que nada: si las anulaciones superan a las salidas por el desfase
    // de RN-53, el mes vale 0.
    serie.push({ mes, consumo: Math.max(0, consumoPorMes.get(mes) ?? 0) });
  }
  return serie;
}

/** Serie de consumo mensual de un producto (FR-001). */
export async function serieDeConsumo(productoId: number, ahora: Date = new Date()): Promise<SerieDeConsumo> {
  const movimientos = await prisma.movimientoInventario.findMany({
    where: { productoId, tipo: { in: TIPOS_DE_CONSUMO } },
    select: { fechaDocumento: true, cantidad: true },
  });
  return armarSerie(movimientos, ahora);
}

/**
 * Series de varios productos con **una sola consulta**: la pantalla de pronóstico las necesita todas y
 * pedirlas de a una serían 25 viajes a la base por carga (research A-06).
 */
export async function seriesDeConsumo(
  productoIds: number[],
  ahora: Date = new Date(),
): Promise<Map<number, SerieDeConsumo>> {
  const series = new Map<number, SerieDeConsumo>(productoIds.map((id) => [id, []]));
  if (productoIds.length === 0) return series;

  const movimientos = await prisma.movimientoInventario.findMany({
    where: { productoId: { in: productoIds }, tipo: { in: TIPOS_DE_CONSUMO } },
    select: { productoId: true, fechaDocumento: true, cantidad: true },
  });

  const porProducto = new Map<number, { fechaDocumento: Date; cantidad: number }[]>();
  for (const movimiento of movimientos) {
    const lista = porProducto.get(movimiento.productoId) ?? [];
    lista.push({ fechaDocumento: movimiento.fechaDocumento, cantidad: movimiento.cantidad });
    porProducto.set(movimiento.productoId, lista);
  }

  for (const productoId of productoIds) {
    series.set(productoId, armarSerie(porProducto.get(productoId) ?? [], ahora));
  }
  return series;
}

/** Solo los consumos, que es lo que reciben las funciones del método (research A-02). */
export function valoresDe(serie: SerieDeConsumo): number[] {
  return serie.map((punto) => punto.consumo);
}
