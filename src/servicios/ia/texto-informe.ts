// Texto guardado de un Informe IA (F-007, data-model §4; FR-012, FR-014).
//
// La columna `informe_ia.texto` guarda texto plano con cuatro títulos fijos. Así el informe se lee tal
// cual si alguien consulta la base, y la pantalla lo vuelve a partir en secciones para mostrarlo. Una
// sección sin elementos se escribe con su frase "Sin … en el período": el modelo no está obligado a
// inventar una alerta que no hay (FR-012).
import type { SeccionesInforme } from "@/esquemas/ia";

export const TITULOS_DE_SECCION = {
  resumen: "Resumen",
  hallazgos: "Hallazgos",
  alertas: "Alertas",
  recomendaciones: "Recomendaciones",
} as const;

/** Lo que se muestra cuando una sección vino vacía. */
export const SECCION_VACIA = {
  hallazgos: "Sin hallazgos en el período",
  alertas: "Sin alertas en el período",
  recomendaciones: "Sin recomendaciones en el período",
} as const;

type Lista = keyof typeof SECCION_VACIA;
const LISTAS: Lista[] = ["hallazgos", "alertas", "recomendaciones"];

/** Arma el texto que se guarda a partir de la respuesta validada del modelo. */
export function textoDeSecciones(secciones: SeccionesInforme): string {
  const partes = [`${TITULOS_DE_SECCION.resumen}\n${secciones.resumen.trim()}`];
  for (const lista of LISTAS) {
    const elementos = secciones[lista];
    const cuerpo = elementos.length === 0 ? SECCION_VACIA[lista] : elementos.map((elemento) => `- ${elemento.trim()}`).join("\n");
    partes.push(`${TITULOS_DE_SECCION[lista]}\n${cuerpo}`);
  }
  return partes.join("\n\n");
}

export type SeccionMostrada = { titulo: string; parrafos: string[]; vinetas: string[] };

/**
 * Vuelve a partir el texto guardado en sus cuatro secciones, para mostrarlo con títulos y viñetas. Las
 * líneas que empiezan con "- " son viñetas; las demás, párrafos (la frase "Sin … en el período" incluida).
 */
export function seccionesDeTexto(texto: string): SeccionMostrada[] {
  const titulos = new Set<string>(Object.values(TITULOS_DE_SECCION));
  const secciones: SeccionMostrada[] = [];
  for (const linea of texto.split(/\r?\n/)) {
    const limpia = linea.trim();
    if (titulos.has(limpia)) {
      secciones.push({ titulo: limpia, parrafos: [], vinetas: [] });
      continue;
    }
    if (!limpia) continue;
    // Un texto sin títulos (no debería pasar) se muestra entero como un único bloque.
    if (secciones.length === 0) secciones.push({ titulo: TITULOS_DE_SECCION.resumen, parrafos: [], vinetas: [] });
    const actual = secciones[secciones.length - 1]!;
    if (limpia.startsWith("- ")) actual.vinetas.push(limpia.slice(2));
    else actual.parrafos.push(limpia);
  }
  return secciones;
}
