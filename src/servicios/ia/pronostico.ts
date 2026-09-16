// Pronóstico del mes en curso y reposición sugerida (F-007, research A-03, A-05, A-06; FR-002 a FR-007).
//
// Todo se calcula al consultar y nada se guarda (FR-004): si mañana se registra un documento con fecha
// pasada, el pronóstico ya lo refleja. Tampoco se usa internet (FR-007): son cuentas sobre el kardex.
import { mesEnCurso } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import { MESES_MINIMOS_HOLT_WINTERS, ajustarHoltWinters, promedioMovil, pronosticarHoltWinters } from "./holt-winters";
import { type SerieDeConsumo, seriesDeConsumo, valoresDe } from "./serie";

export type MetodoDePronostico = "holt-winters" | "promedio-movil" | "promedio-disponible" | "sin-historial";

/** Lo que se lee en pantalla para cada método (research A-03). */
export const ETIQUETA_DEL_METODO: Record<MetodoDePronostico, string> = {
  "holt-winters": "Holt-Winters",
  "promedio-movil": "Promedio móvil (3 meses)",
  "promedio-disponible": "Promedio de los meses disponibles",
  "sin-historial": "Sin historial",
};

/** Meses que promedia el método simple y el de referencia (research A-03). */
export const VENTANA_PROMEDIO_MOVIL = 3;

/**
 * Mes que se pronostica: el mes en curso, el primero sin datos completos (aclaración del 13/09). Es una
 * función y no una constante porque el servidor queda encendido días enteros y el mes cambia.
 */
export function mesPronosticado(ahora: Date = new Date()): string {
  return mesEnCurso(ahora);
}

/**
 * Método según la historia disponible (FR-002). Holt-Winters necesita dos ciclos completos para estimar
 * la estacionalidad; con menos, un promedio es más honesto que un método mal ajustado.
 */
export function metodoParaSerie(serie: SerieDeConsumo): MetodoDePronostico {
  if (!serie.some((punto) => punto.consumo > 0)) return "sin-historial";
  if (serie.length >= MESES_MINIMOS_HOLT_WINTERS) return "holt-winters";
  if (serie.length >= VENTANA_PROMEDIO_MOVIL) return "promedio-movil";
  return "promedio-disponible";
}

/** Redondeo a un decimal, que es como se muestra el pronóstico (FR-003). */
export function aUnDecimal(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/** Pronóstico del mes siguiente a la serie con el método elegido, a un decimal y nunca negativo. */
export function pronosticarProducto(serie: SerieDeConsumo): { metodo: MetodoDePronostico; etiqueta: string; pronostico: number } {
  const metodo = metodoParaSerie(serie);
  const valores = valoresDe(serie);

  let pronostico = 0;
  if (metodo === "holt-winters") {
    pronostico = pronosticarHoltWinters(ajustarHoltWinters(valores), 1)[0] ?? 0;
  } else if (metodo !== "sin-historial") {
    // Con 1 o 2 meses la ventana de 3 promedia los que hay: es el "promedio de los meses disponibles".
    pronostico = promedioMovil(valores, VENTANA_PROMEDIO_MOVIL);
  }

  return { metodo, etiqueta: ETIQUETA_DEL_METODO[metodo], pronostico: aUnDecimal(Math.max(0, pronostico)) };
}

/**
 * Reposición sugerida (FR-005): lo que se va a consumir, más el mínimo que se quiere conservar, menos lo
 * que ya hay; hacia arriba, porque no se compra media unidad, y nunca negativa.
 *
 *   reposición = máx(0, ⌈pronóstico + stock mínimo − stock actual⌉)
 *
 * La suma se redondea a un decimal antes del techo: el pronóstico ya viene con un decimal y, sin ese
 * paso, un error de coma flotante (20,1 + 10 − 30,1 = 0,0000000000000036) sugeriría comprar 1 unidad.
 */
export function reposicionSugerida(pronostico: number, stockMinimo: number, stockActual: number): number {
  return Math.max(0, Math.ceil(aUnDecimal(pronostico + stockMinimo - stockActual)));
}

export type FilaDePronostico = {
  productoId: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  mesPronosticado: string;
  metodo: MetodoDePronostico;
  etiquetaMetodo: string;
  pronostico: number;
  stockActual: number;
  stockMinimo: number;
  reposicionSugerida: number;
};

/**
 * Pantalla de pronóstico (FR-006): una fila por producto **activo** —un producto dado de baja no se
 * vuelve a comprar—, con los filtros por categoría y "solo con reposición mayor que 0" y el total de
 * unidades sugeridas. Solo lee: no escribe nada en la base (FR-004).
 */
export async function pronosticoDeProductos(
  { categoriaId, soloConReposicion = false }: { categoriaId?: number; soloConReposicion?: boolean } = {},
  ahora: Date = new Date(),
): Promise<{ mesPronosticado: string; filas: FilaDePronostico[]; totales: { unidadesSugeridas: number; productos: number } }> {
  const productos = await prisma.producto.findMany({
    where: { activo: true, categoriaId },
    orderBy: { codigo: "asc" },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      stockActual: true,
      stockMinimo: true,
      categoria: { select: { nombre: true } },
      unidadMedida: { select: { nombre: true } },
    },
  });
  const series = await seriesDeConsumo(
    productos.map((producto) => producto.id),
    ahora,
  );
  const mes = mesPronosticado(ahora);

  const filas = productos
    .map((producto): FilaDePronostico => {
      const { metodo, etiqueta, pronostico } = pronosticarProducto(series.get(producto.id) ?? []);
      return {
        productoId: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria.nombre,
        unidad: producto.unidadMedida.nombre,
        mesPronosticado: mes,
        metodo,
        etiquetaMetodo: etiqueta,
        pronostico,
        stockActual: producto.stockActual,
        stockMinimo: producto.stockMinimo,
        reposicionSugerida: reposicionSugerida(pronostico, producto.stockMinimo, producto.stockActual),
      };
    })
    .filter((fila) => !soloConReposicion || fila.reposicionSugerida > 0);

  return {
    mesPronosticado: mes,
    filas,
    totales: {
      unidadesSugeridas: filas.reduce((total, fila) => total + fila.reposicionSugerida, 0),
      productos: filas.length,
    },
  };
}
