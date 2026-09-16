import type { FiltroReporteCompras } from "@/esquemas/reportes";

/**
 * Filtros de R-1 como parámetros de dirección: los comparten la paginación y el enlace "Imprimir", para que
 * la hoja impresa corresponda exactamente a lo que se ve en pantalla (research E-05).
 */
export function parametrosDeCompras(filtro: FiltroReporteCompras): URLSearchParams {
  const parametros = new URLSearchParams({ desde: filtro.desde, hasta: filtro.hasta });
  if (filtro.proveedor) parametros.set("proveedor", String(filtro.proveedor));
  if (filtro.incluirAnulados) parametros.set("incluirAnulados", "si");
  return parametros;
}
