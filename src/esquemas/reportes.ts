// Filtros de los cinco reportes (F-006, data-model §1 y §2). Los usan el formulario de filtros de cada
// reporte y su página (principio VI). Los reportes solo consultan: no hay Server Actions ni datos que
// escribir (FR-005).
//
// Un valor inválido en la dirección nunca rompe la página: toma el valor por defecto y la página lo avisa
// (FR-002). La única regla que se rechaza es "desde" posterior a "hasta".
import { z } from "zod";
import { hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";
import { fechaDeFiltro, vacioComoAusente } from "./comunes";

/** Id opcional de un catálogo en un filtro: un valor inválido se trata como "todos". */
const idDeFiltro = z.preprocess(vacioComoAusente, z.coerce.number().int().positive()).optional().catch(undefined);

/** Casilla de un filtro: llega "si" cuando está marcada y no llega cuando no lo está. */
const casillaSi = z
  .literal("si")
  .optional()
  .catch(undefined)
  .transform((valor) => valor === "si");

/** Página del listado en pantalla; la vista de impresión no la usa (research E-04). */
const paginaDeReporte = z.preprocess(vacioComoAusente, z.coerce.number().int().min(1).default(1)).catch(1);

/** Rango de fechas de un reporte: por defecto, del día 1 del mes en curso a hoy (FR-002). */
const rangoDeReporte = {
  desde: fechaDeFiltro(inicioDelMesEnCurso),
  hasta: fechaDeFiltro(hoyEnLaPaz),
};

const rangoOrdenado = <T extends { desde: string; hasta: string }>(esquema: z.ZodType<T>) =>
  esquema.refine((filtro) => filtro.desde <= filtro.hasta, {
    error: "La fecha «desde» no puede ser posterior a «hasta»",
    path: ["hasta"],
  });

export const esquemaReporteCompras = rangoOrdenado(
  z.object({ ...rangoDeReporte, proveedor: idDeFiltro, incluirAnulados: casillaSi, pagina: paginaDeReporte }),
);

export const esquemaReporteDistribuciones = rangoOrdenado(
  z.object({ ...rangoDeReporte, representante: idDeFiltro, producto: idDeFiltro, incluirAnulados: casillaSi, pagina: paginaDeReporte }),
);

/** R-3 no lleva rango: muestra la situación al momento de emitirlo (Historia 3 · E4). */
export const esquemaReporteExistencias = z.object({
  categoria: idDeFiltro,
  soloBajoMinimo: casillaSi,
});

/** El producto de R-4 es obligatorio para consultar; si falta, la página lo pide (Historia 4 · E3). */
export const esquemaReporteKardex = rangoOrdenado(z.object({ ...rangoDeReporte, producto: idDeFiltro }));

export const ESTADOS_REPORTE_PEDIDOS = ["todos", "pendientes", "parciales", "atendidos", "anulados"] as const;
export type EstadoReportePedidos = (typeof ESTADOS_REPORTE_PEDIDOS)[number];

export const esquemaReportePedidos = rangoOrdenado(
  z.object({
    ...rangoDeReporte,
    estado: z.enum(ESTADOS_REPORTE_PEDIDOS).catch("todos"),
    representante: idDeFiltro,
    incluirAnulados: casillaSi,
    pagina: paginaDeReporte,
  }),
);

/**
 * Línea de "filtros aplicados" del encabezado del reporte (FR-006): las partes con valor se escriben
 * "Etiqueta: valor" y las que son solo etiqueta ("Del 01/09/2026 al 15/09/2026", "Incluye anuladas") van
 * tal cual. Sin ninguna parte, la hoja dice "Sin filtros" en lugar de dejar el espacio en blanco.
 */
export function textoDeFiltros(partes: { etiqueta: string; valor?: string | null }[]): string {
  const texto = partes
    // Una parte con la clave `valor` vacía es un filtro sin elegir: no se escribe.
    .filter((parte) => !("valor" in parte) || Boolean(parte.valor))
    .map((parte) => (parte.valor ? `${parte.etiqueta}: ${parte.valor}` : parte.etiqueta))
    .join(" · ");
  return texto || "Sin filtros";
}

export type FiltroReporteCompras = z.infer<typeof esquemaReporteCompras>;
export type FiltroReporteDistribuciones = z.infer<typeof esquemaReporteDistribuciones>;
export type FiltroReporteExistencias = z.infer<typeof esquemaReporteExistencias>;
export type FiltroReporteKardex = z.infer<typeof esquemaReporteKardex>;
export type FiltroReportePedidos = z.infer<typeof esquemaReportePedidos>;
