"use client";

import { Filtros } from "@/componentes/ui/filtros";
import { esquemaFiltroPersonal, type FiltroPersonal } from "@/esquemas/personal";

/** Filtros del listado de personal, validados con esquemaFiltroPersonal (principio VI). */
export function FiltrosPersonal({ valores }: { valores: FiltroPersonal }) {
  return (
    <Filtros esquema={esquemaFiltroPersonal} accion="/personal">
      <div className="flex flex-col gap-1">
        <label htmlFor="q" className="text-sm font-medium">
          Buscar
        </label>
        <input
          id="q"
          name="q"
          type="search"
          maxLength={60}
          defaultValue={valores.q ?? ""}
          placeholder="Nombre, apellido o usuario"
          className="rounded-md border border-borde px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="estado" className="text-sm font-medium">
          Estado
        </label>
        <select id="estado" name="estado" defaultValue={valores.estado} className="rounded-md border border-borde px-3 py-2">
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
      </div>
    </Filtros>
  );
}
