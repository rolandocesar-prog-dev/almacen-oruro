// Evaluación del pronóstico con validación reservada (F-007, research A-04; FR-008, FR-009).
//
// La pregunta que responde es la del tribunal: "¿cómo saben que el método pronostica bien?". Se separan
// los últimos 6 meses, se pronostican con cada método usando SOLO los meses anteriores y se mide el error
// contra lo que de verdad se consumió. Dos métodos simples sirven de vara: si el principal no les gana,
// no vale la pena su complejidad. Como el pronóstico, se calcula al consultar y no se guarda (FR-004).
import { prisma } from "@/lib/prisma";
import { ajustarHoltWinters, ingenuoEstacional, MESES_MINIMOS_HOLT_WINTERS, promedioMovil, pronosticarHoltWinters } from "./holt-winters";
import { VENTANA_PROMEDIO_MOVIL } from "./pronostico";
import { type SerieDeConsumo, seriesDeConsumo, valoresDe } from "./serie";

/** Meses reservados para validar (FR-008). */
export const MESES_DE_VALIDACION = 6;

/** 24 de ajuste (lo que necesita Holt-Winters) + 6 de validación (FR-008). */
export const MESES_MINIMOS_EVALUACION = MESES_MINIMOS_HOLT_WINTERS + MESES_DE_VALIDACION;

export const MOTIVO_NO_EVALUABLE = "No evaluable: se necesitan al menos 30 meses";

export type MetodoEvaluado = "holt-winters" | "ingenuo-estacional" | "promedio-movil";

/** Orden de las columnas y del desempate: ante igual MAE gana el que aparece primero. */
export const METODOS_EVALUADOS: { metodo: MetodoEvaluado; etiqueta: string }[] = [
  { metodo: "holt-winters", etiqueta: "Holt-Winters" },
  { metodo: "ingenuo-estacional", etiqueta: "Ingenuo estacional" },
  { metodo: "promedio-movil", etiqueta: "Promedio móvil (3 meses)" },
];

/** Suma de los errores absolutos: el numerador común de MAE y WAPE. */
function sumaDeErrores(pronosticos: number[], reales: number[]): number {
  return pronosticos.reduce((total, valor, indice) => total + Math.abs(valor - (reales[indice] ?? 0)), 0);
}

function suma(valores: number[]): number {
  return valores.reduce((total, valor) => total + valor, 0);
}

/**
 * Error absoluto medio (MAE): en promedio, por cuántas unidades se equivoca el método cada mes.
 *   MAE = Σ |pronóstico − real| / n
 */
export function mae(pronosticos: number[], reales: number[]): number {
  if (pronosticos.length === 0) return 0;
  return sumaDeErrores(pronosticos, reales) / pronosticos.length;
}

/**
 * Error porcentual absoluto ponderado (WAPE): qué parte de lo consumido fue error. Permite comparar
 * productos de distinto volumen, cosa que el MAE no hace.
 *   WAPE = Σ |pronóstico − real| / Σ real
 * Si en esos meses no se consumió nada no hay contra qué dividir: "No aplica" (`null`, FR-009).
 */
export function wape(pronosticos: number[], reales: number[]): number | null {
  const totalReal = suma(reales);
  if (totalReal === 0) return null;
  return sumaDeErrores(pronosticos, reales) / totalReal;
}

/**
 * Pronósticos de cada método para los meses de validación, calculados **solo con los meses de ajuste**.
 *
 * Holt-Winters repite su búsqueda en rejilla sobre esos meses: si eligiera los parámetros mirando la
 * validación, se estaría evaluando con las respuestas a la vista y el resultado lo favorecería sin
 * merecerlo (aclaración del 13/09). El promedio móvil no se actualiza con los meses que va
 * pronosticando: repite el mismo valor para los 6, porque en el momento del pronóstico no los conoce.
 */
function pronosticosDeValidacion(ajuste: number[]): Record<MetodoEvaluado, number[]> {
  return {
    "holt-winters": pronosticarHoltWinters(ajustarHoltWinters(ajuste), MESES_DE_VALIDACION),
    "ingenuo-estacional": ingenuoEstacional(ajuste, MESES_DE_VALIDACION),
    "promedio-movil": Array.from({ length: MESES_DE_VALIDACION }, () => promedioMovil(ajuste, VENTANA_PROMEDIO_MOVIL)),
  };
}

export type ResultadoDeMetodo = {
  metodo: MetodoEvaluado;
  etiqueta: string;
  mae: number;
  wape: number | null;
  pronosticos: number[];
};

export type EvaluacionDeProducto =
  | { evaluable: false; motivo: string }
  | {
      evaluable: true;
      /** Meses reservados con su consumo real. */
      validacion: { mes: string; real: number }[];
      porMetodo: ResultadoDeMetodo[];
      /** Método de menor MAE; ante empate, el primero de METODOS_EVALUADOS. */
      mejor: MetodoEvaluado;
    };

/** Evaluación de un producto (FR-008, FR-009). */
export function evaluarProducto(serie: SerieDeConsumo): EvaluacionDeProducto {
  if (serie.length < MESES_MINIMOS_EVALUACION) return { evaluable: false, motivo: MOTIVO_NO_EVALUABLE };

  const valores = valoresDe(serie);
  const ajuste = valores.slice(0, -MESES_DE_VALIDACION);
  const reales = valores.slice(-MESES_DE_VALIDACION);
  const pronosticos = pronosticosDeValidacion(ajuste);

  const porMetodo = METODOS_EVALUADOS.map(({ metodo, etiqueta }) => ({
    metodo,
    etiqueta,
    mae: mae(pronosticos[metodo], reales),
    wape: wape(pronosticos[metodo], reales),
    pronosticos: pronosticos[metodo],
  }));

  // Estrictamente menor: un empate deja el que ya estaba, que es el que figura primero.
  let mejor = porMetodo[0]!;
  for (const resultado of porMetodo) if (resultado.mae < mejor.mae) mejor = resultado;

  return {
    evaluable: true,
    validacion: serie.slice(-MESES_DE_VALIDACION).map((punto) => ({ mes: punto.mes, real: punto.consumo })),
    porMetodo,
    mejor: mejor.metodo,
  };
}

export type ResultadoGeneral = {
  metodo: MetodoEvaluado;
  etiqueta: string;
  /** Promedio del MAE de los productos evaluables. */
  maePromedio: number;
  /** Σ errores de todos los productos / Σ consumo real de todos: pesa más lo que más se consume. */
  wapeGlobal: number | null;
};

export type FilaDeEvaluacion = { productoId: number; codigo: string; nombre: string; unidad: string; evaluacion: EvaluacionDeProducto };

/**
 * Evaluación de todo el catálogo activo (FR-009): una fila por producto y el resultado general de cada
 * método sobre los productos evaluables. Los no evaluables se listan aparte y no entran en el general.
 */
export async function evaluarCatalogo(ahora: Date = new Date()): Promise<{
  filas: FilaDeEvaluacion[];
  general: ResultadoGeneral[];
  mejorGeneral: MetodoEvaluado | null;
  evaluables: number;
}> {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    orderBy: { codigo: "asc" },
    select: { id: true, codigo: true, nombre: true, unidadMedida: { select: { nombre: true } } },
  });
  const series = await seriesDeConsumo(
    productos.map((producto) => producto.id),
    ahora,
  );

  const filas = productos.map((producto) => ({
    productoId: producto.id,
    codigo: producto.codigo,
    nombre: producto.nombre,
    unidad: producto.unidadMedida.nombre,
    evaluacion: evaluarProducto(series.get(producto.id) ?? []),
  }));

  const evaluadas = filas.flatMap((fila) => (fila.evaluacion.evaluable ? [{ ...fila.evaluacion, fila }] : []));
  const realTotal = suma(evaluadas.flatMap((evaluacion) => evaluacion.validacion.map((mes) => mes.real)));

  const general: ResultadoGeneral[] =
    evaluadas.length === 0
      ? []
      : METODOS_EVALUADOS.map(({ metodo, etiqueta }) => {
          const resultados = evaluadas.map((evaluacion) => ({
            resultado: evaluacion.porMetodo.find((r) => r.metodo === metodo)!,
            reales: evaluacion.validacion.map((mes) => mes.real),
          }));
          const errores = suma(resultados.map(({ resultado, reales }) => sumaDeErrores(resultado.pronosticos, reales)));
          return {
            metodo,
            etiqueta,
            maePromedio: suma(resultados.map(({ resultado }) => resultado.mae)) / resultados.length,
            wapeGlobal: realTotal === 0 ? null : errores / realTotal,
          };
        });

  let mejorGeneral: ResultadoGeneral | null = null;
  for (const resultado of general) if (mejorGeneral === null || resultado.maePromedio < mejorGeneral.maePromedio) mejorGeneral = resultado;

  return { filas, general, mejorGeneral: mejorGeneral?.metodo ?? null, evaluables: evaluadas.length };
}
