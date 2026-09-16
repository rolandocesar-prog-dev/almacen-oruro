import type { FiltroReporteExistencias } from "@/esquemas/reportes";

/** Filtros de R-3 como parámetros de dirección, para que la hoja impresa muestre lo mismo (E-05). */
export function parametrosDeExistencias(filtro: FiltroReporteExistencias): URLSearchParams {
  const parametros = new URLSearchParams();
  if (filtro.categoria) parametros.set("categoria", String(filtro.categoria));
  if (filtro.soloBajoMinimo) parametros.set("soloBajoMinimo", "si");
  return parametros;
}
