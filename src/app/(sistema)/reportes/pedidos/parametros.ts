import type { FiltroReportePedidos } from "@/esquemas/reportes";

/** Filtros de R-5 como parámetros de dirección, para que la hoja impresa muestre lo mismo (E-05). */
export function parametrosDePedidos(filtro: FiltroReportePedidos): URLSearchParams {
  const parametros = new URLSearchParams({ desde: filtro.desde, hasta: filtro.hasta, estado: filtro.estado });
  if (filtro.representante) parametros.set("representante", String(filtro.representante));
  if (filtro.incluirAnulados) parametros.set("incluirAnulados", "si");
  return parametros;
}

/** Texto del estado elegido para el encabezado del reporte. */
export const ETIQUETA_ESTADO: Record<FiltroReportePedidos["estado"], string> = {
  todos: "Todos",
  pendientes: "Pendientes",
  parciales: "Parciales",
  atendidos: "Atendidos",
  anulados: "Anulados",
};
