"use client";

import { Filtros } from "@/componentes/ui/filtros";
import { esquemaFiltroInformes, type FiltroInformes } from "@/esquemas/ia";

/** Filtro del listado de informes guardados por tipo (FR-016). */
export function FiltrosInformes({ valores }: { valores: FiltroInformes }) {
  return (
    <Filtros esquema={esquemaFiltroInformes} accion="/ia/informes">
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="tipo" className="text-sm font-medium">
          Tipo
        </label>
        <select id="tipo" name="tipo" defaultValue={valores.tipo} className="min-w-0 max-w-full rounded-md border border-borde px-3 py-2">
          <option value="todos">Todos</option>
          <option value="COMPRAS">Informes de compras</option>
          <option value="DISTRIBUCIONES">Informes de distribuciones</option>
        </select>
      </div>
    </Filtros>
  );
}
