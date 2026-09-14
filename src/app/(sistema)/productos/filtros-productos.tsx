"use client";

import { CampoBusqueda, CampoEstado } from "@/componentes/catalogos/campos-filtro";
import { Filtros } from "@/componentes/ui/filtros";
import type { OpcionSelector } from "@/componentes/ui/selector";
import { esquemaFiltroProductos, type FiltroProductos } from "@/esquemas/catalogos/producto";

/**
 * Filtros del listado de productos, validados con esquemaFiltroProductos (principio VI).
 * El selector de categoría ofrece todas, también las inactivas, para poder encontrar sus productos.
 */
export function FiltrosProductos({ valores, categorias }: { valores: FiltroProductos; categorias: OpcionSelector[] }) {
  return (
    <Filtros esquema={esquemaFiltroProductos} accion="/productos">
      <CampoBusqueda valor={valores.q} ayuda="Código o nombre" />
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="categoria" className="text-sm font-medium">
          Categoría
        </label>
        <select id="categoria" name="categoria" defaultValue={valores.categoria ?? ""} className="min-w-0 rounded-md border border-borde px-3 py-2">
          <option value="">Todas</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.etiqueta}
            </option>
          ))}
        </select>
      </div>
      <CampoEstado valor={valores.estado} />
    </Filtros>
  );
}
