import type { FiltroReporteKardex } from "@/esquemas/reportes";

/** Filtros de R-4 como parámetros de dirección, para que la hoja impresa muestre lo mismo (E-05). */
export function parametrosDeKardex(filtro: FiltroReporteKardex): URLSearchParams {
  const parametros = new URLSearchParams({ desde: filtro.desde, hasta: filtro.hasta });
  if (filtro.producto) parametros.set("producto", String(filtro.producto));
  return parametros;
}
