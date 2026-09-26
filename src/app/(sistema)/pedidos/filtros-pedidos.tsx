"use client";

import { Filtros } from "@/componentes/ui/filtros";
import type { OpcionSelector } from "@/componentes/ui/selector";
import { esquemaFiltroPedidos, type EstadoFiltroPedidos, type FiltroPedidos } from "@/esquemas/pedidos";

const etiquetasEstado: Record<EstadoFiltroPedidos, string> = {
  "por-atender": "Por atender",
  pendientes: "Pendientes",
  parciales: "Parciales",
  atendidos: "Atendidos",
  anulados: "Anulados",
  todos: "Todos",
};

/** Filtros del listado de pedidos, validados con esquemaFiltroPedidos (principio VI). */
export function FiltrosPedidos({ valores, representantes }: { valores: FiltroPedidos; representantes: OpcionSelector[] }) {
  return (
    <Filtros esquema={esquemaFiltroPedidos} accion="/pedidos">
      <div className="flex flex-col gap-1">
        <label htmlFor="estado" className="text-sm font-medium">
          Estado
        </label>
        <select id="estado" name="estado" defaultValue={valores.estado} className="rounded-md border border-borde-campo px-3 py-2">
          {Object.entries(etiquetasEstado).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="representante" className="text-sm font-medium">
          Representante
        </label>
        <select
          id="representante"
          name="representante"
          defaultValue={valores.representante ?? ""}
          className="min-w-0 max-w-full rounded-md border border-borde-campo px-3 py-2"
        >
          <option value="">Todos</option>
          {representantes.map((representante) => (
            <option key={representante.id} value={representante.id}>
              {representante.etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="desde" className="text-sm font-medium">
          Desde
        </label>
        <input id="desde" name="desde" type="date" defaultValue={valores.desde ?? ""} className="rounded-md border border-borde-campo px-3 py-2" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="hasta" className="text-sm font-medium">
          Hasta
        </label>
        <input id="hasta" name="hasta" type="date" defaultValue={valores.hasta ?? ""} className="rounded-md border border-borde-campo px-3 py-2" />
      </div>
    </Filtros>
  );
}
