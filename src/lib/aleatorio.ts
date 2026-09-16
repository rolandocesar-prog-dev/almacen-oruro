// Generador pseudoaleatorio sembrado (F-007, research A-07; FR-019).
//
// El histórico simulado tiene que ser reproducible: con la misma semilla, la misma base de demostración
// (SC-001). `Math.random()` no sirve para eso —no admite semilla y cada corrida daría otros datos, así
// que el capítulo de resultados del proyecto no se podría repetir—. `mulberry32` cabe en cinco líneas,
// se explica sin dependencias y alcanza de sobra para elegir cantidades y fechas verosímiles.

/**
 * Devuelve una función que entrega valores en `[0, 1)`, siempre la misma secuencia para la misma semilla.
 *
 * Cómo funciona: guarda un estado entero de 32 bits, en cada llamada lo avanza sumándole una constante
 * grande y lo mezcla con desplazamientos y multiplicaciones para que los bits altos y bajos se revuelvan;
 * el resultado se divide entre 2³² para caer en `[0, 1)`. `>>> 0` fuerza aritmética de 32 bits sin signo.
 */
export function generadorAleatorio(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let mezcla = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    mezcla = (mezcla + Math.imul(mezcla ^ (mezcla >>> 7), 61 | mezcla)) ^ mezcla;
    return ((mezcla ^ (mezcla >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entero entre `minimo` y `maximo`, ambos incluidos. */
export function enteroEntre(aleatorio: () => number, minimo: number, maximo: number): number {
  return minimo + Math.floor(aleatorio() * (maximo - minimo + 1));
}

/** Elige un elemento de la lista. La lista no puede estar vacía. */
export function elegirDe<T>(aleatorio: () => number, opciones: readonly [T, ...T[]]): T {
  return opciones[Math.floor(aleatorio() * opciones.length)] ?? opciones[0];
}
