"use client";

import { CampoBusqueda } from "@/componentes/catalogos/campos-filtro";
import { Filtros } from "@/componentes/ui/filtros";
import type { OpcionSelector } from "@/componentes/ui/selector";
import { esquemaFiltroExistencias, type FiltroExistencias } from "@/esquemas/inventario";

/** Filtros de la consulta de existencias, validados con esquemaFiltroExistencias (principio VI). */
export function FiltrosExistencias({ valores, categorias }: { valores: FiltroExistencias; categorias: OpcionSelector[] }) {
  return (
    <Filtros esquema={esquemaFiltroExistencias} accion="/existencias">
      <CampoBusqueda valor={valores.q} ayuda="Código o nombre" />
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="categoria" className="text-sm font-medium">
          Categoría
        </label>
        <select id="categoria" name="categoria" defaultValue={valores.categoria ?? ""} className="min-w-0 rounded-md border border-borde-campo px-3 py-2">
          <option value="">Todas</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="estado" className="text-sm font-medium">
          Estado
        </label>
        <select id="estado" name="estado" defaultValue={valores.estado} className="rounded-md border border-borde-campo px-3 py-2">
          <option value="habituales">Activos e inactivos con stock</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
      </div>
      <label className="flex items-center gap-2 py-2 text-sm font-medium">
        <input type="checkbox" name="bajoMinimo" value="si" defaultChecked={valores.bajoMinimo === "si"} className="h-4 w-4" />
        Solo bajo mínimo
      </label>
    </Filtros>
  );
}
