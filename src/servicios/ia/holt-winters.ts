// Método principal de pronóstico: Holt-Winters aditivo con estacionalidad de 12 meses
// (F-007, research A-02; FR-003, FR-023; constitución, principios I y VIII).
//
// Está escrito en el proyecto, en funciones puras y sin ninguna librería, por una razón: el tribunal
// tiene que poder seguir el cálculo paso a paso. Una librería de series de tiempo sería una caja negra
// y no se podría explicar por qué salió ese número.
//
// La idea del método en una línea: la serie se descompone en tres partes —nivel (cuánto se consume en
// general), tendencia (si sube o baja mes a mes) y estacionalidad (cuánto se aparta cada mes del año
// de ese promedio)— y cada mes observado corrige las tres con un peso entre 0 y 1.

/** Meses de un ciclo estacional: el consumo de limpieza se repite año a año (S-06). */
export const PERIODO_ESTACIONAL = 12;

/** Con menos de dos ciclos no se pueden estimar los índices estacionales (research A-03). */
export const MESES_MINIMOS_HOLT_WINTERS = 2 * PERIODO_ESTACIONAL;

/** Rejilla de parámetros: 0,1 a 0,9. Las tres juntas dan 9 × 9 × 9 = 729 combinaciones (FR-003). */
const REJILLA = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9] as const;

export type AjusteHoltWinters = {
  /** Peso del nivel. */
  alfa: number;
  /** Peso de la tendencia. */
  beta: number;
  /** Peso de la estacionalidad. */
  gamma: number;
  /** Nivel al final de la serie. */
  nivel: number;
  /** Tendencia al final de la serie. */
  tendencia: number;
  /** Índice estacional de cada posición del ciclo (0 = primer mes de la serie, 11 = duodécimo). */
  estacionales: number[];
  /** Cuántos meses tenía la serie: define en qué posición del ciclo sigue el pronóstico. */
  mesesObservados: number;
  /** MAE de pronóstico a un mes dentro de los datos de ajuste: es lo que minimiza la rejilla. */
  maeAjuste: number;
  /** Cuántas combinaciones se probaron; siempre 729, se expone para poder mostrarlo y probarlo. */
  combinacionesProbadas: number;
};

/** Promedio de un arreglo; sin datos, 0. */
function promedio(valores: number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

/**
 * Paso 1 · Valores iniciales, calculados siempre igual para que el resultado sea reproducible (FR-004):
 *
 * - nivel = promedio del primer año;
 * - tendencia = (promedio del segundo año − promedio del primero) / 12, o sea el crecimiento mensual;
 * - índice estacional de cada mes calendario = promedio de `valor − promedio de su año`, es decir
 *   cuántas unidades se aparta ese mes del promedio del año al que pertenece.
 */
function valoresIniciales(valores: number[]) {
  const primerAnio = valores.slice(0, PERIODO_ESTACIONAL);
  const segundoAnio = valores.slice(PERIODO_ESTACIONAL, 2 * PERIODO_ESTACIONAL);

  const nivel = promedio(primerAnio);
  const tendencia = (promedio(segundoAnio) - nivel) / PERIODO_ESTACIONAL;

  // Solo se usan los años completos: un año a medias desviaría su promedio y con él los índices.
  const aniosCompletos = Math.floor(valores.length / PERIODO_ESTACIONAL);
  const desviaciones: number[][] = Array.from({ length: PERIODO_ESTACIONAL }, () => []);
  for (let anio = 0; anio < aniosCompletos; anio += 1) {
    const meses = valores.slice(anio * PERIODO_ESTACIONAL, (anio + 1) * PERIODO_ESTACIONAL);
    const promedioDelAnio = promedio(meses);
    meses.forEach((valor, mes) => desviaciones[mes]?.push(valor - promedioDelAnio));
  }

  return { nivel, tendencia, estacionales: desviaciones.map(promedio) };
}

/**
 * Paso 2 · Recursión aditiva. Recorre la serie mes a mes y, antes de mirar cada valor, anota qué habría
 * pronosticado con lo que sabía hasta el mes anterior: esa diferencia es la que mide `maeAjuste`.
 */
function recorrerSerie(valores: number[], alfa: number, beta: number, gamma: number) {
  const inicio = valoresIniciales(valores);
  let nivel = inicio.nivel;
  let tendencia = inicio.tendencia;
  const estacionales = [...inicio.estacionales];

  let sumaDeErrores = 0;
  let pronosticosEvaluados = 0;

  valores.forEach((valor, indice) => {
    const mes = indice % PERIODO_ESTACIONAL;
    const estacional = estacionales[mes] ?? 0;

    // Se evalúa desde el segundo año: el primero se usó para fijar los valores iniciales.
    if (indice >= PERIODO_ESTACIONAL) {
      sumaDeErrores += Math.abs(nivel + tendencia + estacional - valor);
      pronosticosEvaluados += 1;
    }

    // Corrección: cada componente se mueve hacia lo observado en la proporción de su parámetro.
    const nivelAnterior = nivel;
    nivel = alfa * (valor - estacional) + (1 - alfa) * (nivel + tendencia);
    tendencia = beta * (nivel - nivelAnterior) + (1 - beta) * tendencia;
    estacionales[mes] = gamma * (valor - nivel) + (1 - gamma) * estacional;
  });

  return {
    nivel,
    tendencia,
    estacionales,
    mesesObservados: valores.length,
    maeAjuste: pronosticosEvaluados === 0 ? 0 : sumaDeErrores / pronosticosEvaluados,
  };
}

/**
 * Paso 3 · Búsqueda en rejilla (FR-003): se prueban las 729 combinaciones de α, β y γ y gana la de menor
 * MAE de pronóstico a un mes **dentro de los datos de ajuste** —nunca se miran los meses de validación
 * (research A-04)—. Ante un empate gana la combinación de valores más bajos, en orden α, β, γ: como la
 * rejilla se recorre en ese orden y solo se reemplaza al mejorar de verdad, el desempate sale solo.
 */
export function ajustarHoltWinters(valores: number[]): AjusteHoltWinters {
  if (valores.length < MESES_MINIMOS_HOLT_WINTERS) {
    throw new Error("Holt-Winters necesita al menos 24 meses de historia para estimar la estacionalidad");
  }

  let mejor: AjusteHoltWinters | null = null;
  let combinacionesProbadas = 0;

  for (const alfa of REJILLA) {
    for (const beta of REJILLA) {
      for (const gamma of REJILLA) {
        combinacionesProbadas += 1;
        const resultado = recorrerSerie(valores, alfa, beta, gamma);
        // Estrictamente menor: un empate deja el que ya estaba, que es el de valores más bajos.
        if (mejor === null || resultado.maeAjuste < mejor.maeAjuste) {
          mejor = { alfa, beta, gamma, ...resultado, combinacionesProbadas: 0 };
        }
      }
    }
  }

  // `mejor` no puede ser nulo: la rejilla siempre tiene 729 combinaciones.
  return { ...mejor!, combinacionesProbadas };
}

/**
 * Paso 4 · Pronóstico a `horizonte` meses: nivel + tendencia × h + el índice estacional del mes que toca.
 *
 * El mes que toca no es el primero del ciclo: si la serie terminó en su mes número N, el primer mes
 * pronosticado ocupa la posición N del ciclo. Empezar siempre en 0 le aplicaría a enero el índice de
 * un mes cualquiera y el pronóstico perdería justamente la estacionalidad que se acaba de estimar.
 *
 * Un consumo no puede ser negativo, así que un valor por debajo de 0 se devuelve como 0 (caso borde).
 */
export function pronosticarHoltWinters(ajuste: AjusteHoltWinters, horizonte: number): number[] {
  const { nivel, tendencia, estacionales, mesesObservados } = ajuste;
  return Array.from({ length: horizonte }, (_, indice) => {
    const pasos = indice + 1;
    const estacional = estacionales[(mesesObservados + indice) % PERIODO_ESTACIONAL] ?? 0;
    return Math.max(0, nivel + tendencia * pasos + estacional);
  });
}

/**
 * Método de referencia 1 y método de los productos con poca historia (research A-03): promedio de los
 * últimos `ventana` meses. Si la serie es más corta que la ventana, promedia lo que hay.
 */
export function promedioMovil(valores: number[], ventana: number): number {
  return promedio(valores.slice(-ventana));
}

/**
 * Método de referencia 2: ingenuo estacional, "este mes consumiremos lo mismo que el año pasado".
 * Con menos de un año de historia no hay mes equivalente y se repite el último valor conocido.
 */
export function ingenuoEstacional(valores: number[], horizonte: number): number[] {
  return Array.from({ length: horizonte }, (_, indice) => {
    const posicion = valores.length - PERIODO_ESTACIONAL + indice;
    if (posicion >= 0 && posicion < valores.length) return valores[posicion] ?? 0;
    return valores.at(-1) ?? 0;
  });
}
