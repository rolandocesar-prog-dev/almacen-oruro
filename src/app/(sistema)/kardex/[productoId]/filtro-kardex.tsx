"use client";

import { Filtros } from "@/componentes/ui/filtros";
import { esquemaFiltroKardex, type FiltroKardex } from "@/esquemas/inventario";

/** Rango de fechas del documento para el kardex, validado con esquemaFiltroKardex (principio VI). */
export function FiltroKardex({ productoId, valores }: { productoId: number; valores: FiltroKardex }) {
  return (
    <Filtros esquema={esquemaFiltroKardex} accion={`/kardex/${productoId}`}>
      <div className="flex flex-col gap-1">
        <label htmlFor="desde" className="text-sm font-medium">
          Desde
        </label>
        <input id="desde" name="desde" type="date" defaultValue={valores.desde ?? ""} className="rounded-md border border-borde px-3 py-2" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="hasta" className="text-sm font-medium">
          Hasta
        </label>
        <input id="hasta" name="hasta" type="date" defaultValue={valores.hasta ?? ""} className="rounded-md border border-borde px-3 py-2" />
      </div>
    </Filtros>
  );
}
