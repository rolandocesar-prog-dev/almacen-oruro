// Esquemas del módulo de inteligencia artificial (F-007, contracts §4; constitución, principio VI).
//
// Tres filtros de pantalla, el formulario de informe nuevo y —lo menos habitual— el esquema con el que
// se valida la **respuesta del modelo de lenguaje**: el modelo es una entrada externa más y, como
// cualquier formulario, no se le cree hasta que pasa por Zod (FR-012, FR-015).
import { z } from "zod";
import { mesAnteriorCompleto } from "@/lib/fechas";
import { fechaDeFiltro, vacioComoAusente } from "./comunes";

/** Id opcional de un catálogo en un filtro: un valor inválido se trata como "todas". */
const idDeFiltro = z.preprocess(vacioComoAusente, z.coerce.number().int().positive()).optional().catch(undefined);

/** Casilla de un filtro: llega "si" cuando está marcada y no llega cuando no lo está. */
const casillaSi = z
  .literal("si")
  .optional()
  .catch(undefined)
  .transform((valor) => valor === "si");

/** Filtros de `/ia/pronostico` (FR-006). Un valor inválido no rompe la página: se ignora. */
export const esquemaFiltroPronostico = z.object({
  categoria: idDeFiltro,
  soloConReposicion: casillaSi,
});

export const TIPOS_DE_INFORME = ["COMPRAS", "DISTRIBUCIONES"] as const;
export type TipoDeInforme = (typeof TIPOS_DE_INFORME)[number];

/** Filtro del listado de informes guardados (FR-016). */
export const esquemaFiltroInformes = z.object({
  tipo: z.enum(["todos", ...TIPOS_DE_INFORME]).catch("todos"),
});

/**
 * Formulario de informe nuevo (FR-010): el tipo es obligatorio y el período viene con el **mes anterior
 * completo** por defecto, que es el que casi siempre se quiere analizar. `desde` no puede ser posterior
 * a `hasta`, igual que en los reportes de F-006.
 */
export const esquemaNuevoInforme = z
  .object({
    tipo: z.enum(TIPOS_DE_INFORME, { error: "Elige el tipo de informe" }),
    desde: fechaDeFiltro(() => mesAnteriorCompleto().desde),
    hasta: fechaDeFiltro(() => mesAnteriorCompleto().hasta),
  })
  .refine((datos) => datos.desde <= datos.hasta, {
    error: "La fecha «desde» no puede ser posterior a «hasta»",
    path: ["hasta"],
  });

/**
 * Respuesta del modelo (data-model §4). Las cuatro secciones son obligatorias, pero los tres arreglos
 * **pueden venir vacíos**: si un período no tiene nada que alertar, exigir al menos una alerta obligaría
 * al modelo a inventarla, que es justo lo que prohíbe FR-012. La pantalla resuelve el caso escribiendo
 * "Sin alertas en el período".
 */
export const esquemaSeccionesInforme = z.object({
  resumen: z.string().trim().min(1, { error: "El resumen no puede estar vacío" }),
  hallazgos: z.array(z.string().trim().min(1)),
  alertas: z.array(z.string().trim().min(1)),
  recomendaciones: z.array(z.string().trim().min(1)),
});

export type FiltroPronostico = z.infer<typeof esquemaFiltroPronostico>;
export type FiltroInformes = z.infer<typeof esquemaFiltroInformes>;
export type NuevoInforme = z.infer<typeof esquemaNuevoInforme>;
export type SeccionesInforme = z.infer<typeof esquemaSeccionesInforme>;
