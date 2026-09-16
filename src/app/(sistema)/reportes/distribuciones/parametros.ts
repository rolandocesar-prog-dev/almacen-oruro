import type { FiltroReporteDistribuciones } from "@/esquemas/reportes";

/** Filtros de R-2 como parámetros de dirección: los comparten la paginación y el enlace "Imprimir" (E-05). */
export function parametrosDeDistribuciones(filtro: FiltroReporteDistribuciones): URLSearchParams {
  const parametros = new URLSearchParams({ desde: filtro.desde, hasta: filtro.hasta });
  if (filtro.representante) parametros.set("representante", String(filtro.representante));
  if (filtro.producto) parametros.set("producto", String(filtro.producto));
  if (filtro.incluirAnulados) parametros.set("incluirAnulados", "si");
  return parametros;
}
