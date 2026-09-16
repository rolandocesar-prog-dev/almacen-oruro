// Resaltado de cifras que no están en los datos (F-007, FR-025, P3; SC-007).
//
// El modelo tiene instrucción de usar solo las cifras de la tabla, pero una instrucción no es una
// garantía. Esta función pura recorre el texto, busca cada número y lo compara con todos los números de
// los datos enviados; los que no aparecen se marcan con la advertencia "Cifra no encontrada en los datos".
// No bloquea nada: ayuda a quien lee a verificar el texto contra la tabla.
//
// Qué se ignora: fechas (01/08/2026, 2026-08-01), años sueltos (2026) y la numeración de listas (1. o 1)).
// Qué se acepta como encontrado: el mismo valor con redondeo a un decimal —las instrucciones lo
// permiten—, sin signo (el texto dice "bajó 25,7 %" cuando el dato es −25,7) y los números que forman
// parte de un nombre o un código de los datos ("Lavandina 1 L", "LIM-001").

export const ADVERTENCIA_CIFRA = "Cifra no encontrada en los datos";

export type Fragmento = { texto: string; noEncontrada?: true };

const FECHA = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}(?:-\d{2})?\b/g;
// Números con miles a la española (1.234,50), con decimales (25,7 o 25.7) o enteros.
const NUMERO = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g;
const TOLERANCIA = 0.05 + 1e-9;

/** Tramos de una línea que son fechas: sus números no se revisan. */
function tramosDeFecha(texto: string): [number, number][] {
  return [...texto.matchAll(FECHA)].map((coincidencia) => [coincidencia.index, coincidencia.index + coincidencia[0].length]);
}

/**
 * Valores posibles de un número escrito. "1.452" puede ser mil cuatrocientos cincuenta y dos (miles a la
 * española) o uno coma cuatro (punto decimal): se aceptan las dos lecturas.
 */
function lecturas(token: string): number[] {
  if (token.includes(",")) return [Number(token.replace(/\./g, "").replace(",", "."))];
  if (/^\d{1,3}(?:\.\d{3})+$/.test(token)) return [Number(token.replace(/\./g, "")), Number(token)];
  return [Number(token)];
}

type Cifra = { inicio: number; fin: number; valores: number[]; ignorar: boolean };

/** Números de un texto, con la marca de los que no se revisan. */
function cifrasDe(texto: string): Cifra[] {
  const fechas = tramosDeFecha(texto);
  return [...texto.matchAll(NUMERO)].map((coincidencia) => {
    const inicio = coincidencia.index;
    const fin = inicio + coincidencia[0].length;
    const token = coincidencia[0];
    const enFecha = fechas.some(([desde, hasta]) => inicio >= desde && fin <= hasta);
    const esAnio = /^\d{4}$/.test(token) && Number(token) >= 1900 && Number(token) <= 2100;
    const esNumeracion = texto.slice(0, inicio).trim() === "" && /^[.)]\s/.test(texto.slice(fin));
    return { inicio, fin, valores: lecturas(token), ignorar: enFecha || esAnio || esNumeracion };
  });
}

/** Todos los números que aparecen en los datos, incluidos los de nombres y códigos. */
export function numerosDeLosDatos(datos: unknown): number[] {
  if (typeof datos === "number") return [datos];
  if (typeof datos === "string") {
    // Montos guardados como texto con punto decimal ("130.00").
    if (/^-?\d+(\.\d+)?$/.test(datos)) return [Number(datos)];
    return cifrasDe(datos).flatMap((cifra) => (cifra.ignorar ? [] : cifra.valores));
  }
  if (Array.isArray(datos)) return datos.flatMap(numerosDeLosDatos);
  if (datos && typeof datos === "object") return Object.values(datos).flatMap(numerosDeLosDatos);
  return [];
}

/** Parte una línea del informe en fragmentos, marcando las cifras que no están en los datos. */
export function marcarCifras(texto: string, numeros: number[]): Fragmento[] {
  const conocidos = numeros.flatMap((numero) => [numero, Math.abs(numero)]);
  const estaEnLosDatos = (valor: number) => conocidos.some((conocido) => Math.abs(conocido - valor) <= TOLERANCIA);

  const fragmentos: Fragmento[] = [];
  let desde = 0;
  for (const cifra of cifrasDe(texto)) {
    if (cifra.ignorar || cifra.valores.some(estaEnLosDatos)) continue;
    if (cifra.inicio > desde) fragmentos.push({ texto: texto.slice(desde, cifra.inicio) });
    fragmentos.push({ texto: texto.slice(cifra.inicio, cifra.fin), noEncontrada: true });
    desde = cifra.fin;
  }
  if (desde < texto.length) fragmentos.push({ texto: texto.slice(desde) });
  return fragmentos;
}

/** Cuántas cifras del texto no están en los datos. */
export function contarCifrasNoEncontradas(texto: string, datos: unknown): number {
  const numeros = numerosDeLosDatos(datos);
  return texto
    .split(/\r?\n/)
    .flatMap((linea) => marcarCifras(linea, numeros))
    .filter((fragmento) => fragmento.noEncontrada).length;
}
