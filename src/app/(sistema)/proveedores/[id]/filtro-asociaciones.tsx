"use client";

import { Filtros } from "@/componentes/ui/filtros";
import { esquemaFiltroAsociaciones, type FiltroAsociaciones } from "@/esquemas/catalogos/proveedor-producto";

/** Elige si la lista muestra los productos que el proveedor ofrece hoy o los que se quitaron (principio VI). */
export function FiltroAsociaciones({ proveedorId, valores }: { proveedorId: number; valores: FiltroAsociaciones }) {
  return (
    <Filtros esquema={esquemaFiltroAsociaciones} accion={`/proveedores/${proveedorId}`}>
      <div className="flex flex-col gap-1">
        <label htmlFor="asociaciones" className="text-sm font-medium">
          Mostrar
        </label>
        <select id="asociaciones" name="asociaciones" defaultValue={valores.asociaciones} className="rounded-md border border-borde-campo px-3 py-2">
          <option value="activas">Productos que ofrece</option>
          <option value="inactivas">Productos quitados</option>
        </select>
      </div>
    </Filtros>
  );
}
