// Filtros de las consultas de inventario (F-003): existencias y kardex. Un valor inválido en la URL
// toma el valor por defecto en lugar de romper la página (principio VI).
import { z } from "zod";
import { esquemaFiltroCatalogo, fechaOpcionalDeFiltro, vacioComoAusente } from "./comunes";

/**
 * Existencias (FR-018, research K-07). `estado`:
 * - `habituales` (por defecto): activos, e inactivos que todavía tienen stock;
 * - `inactivos`: solo inactivos, con o sin stock;
 * - `todos`.
 */
export const esquemaFiltroExistencias = z.object({
  q: esquemaFiltroCatalogo.shape.q,
  categoria: z.preprocess(vacioComoAusente, z.coerce.number().int().positive()).optional().catch(undefined),
  estado: z.enum(["habituales", "inactivos", "todos"]).catch("habituales"),
  bajoMinimo: z.enum(["si"]).optional().catch(undefined),
});

/** Kardex (FR-019): rango opcional por fecha del documento (RN-53). */
export const esquemaFiltroKardex = z
  .object({
    desde: fechaOpcionalDeFiltro(),
    hasta: fechaOpcionalDeFiltro(),
  })
  .refine((filtro) => !filtro.desde || !filtro.hasta || filtro.desde <= filtro.hasta, {
    error: "La fecha «desde» no puede ser posterior a «hasta»",
    path: ["hasta"],
  });

export type FiltroExistencias = z.infer<typeof esquemaFiltroExistencias>;
export type FiltroKardex = z.infer<typeof esquemaFiltroKardex>;
