"use client";

import { Filtros } from "@/componentes/ui/filtros";
import type { OpcionSelector } from "@/componentes/ui/selector";
import { esquemaFiltroPronostico, type FiltroPronostico } from "@/esquemas/ia";

/** Filtros de la pantalla de pronóstico (FR-006): categoría y "solo con reposición mayor que 0". */
export function FiltrosPronostico({ valores, categorias }: { valores: FiltroPronostico; categorias: OpcionSelector[] }) {
  return (
    <Filtros esquema={esquemaFiltroPronostico} accion="/ia/pronostico">
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="categoria" className="text-sm font-medium">
          Categoría
        </label>
        <select id="categoria" name="categoria" defaultValue={valores.categoria ?? ""} className="min-w-0 max-w-full rounded-md border border-borde px-3 py-2">
          <option value="">Todas</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 py-2">
        <input
          id="soloConReposicion"
          name="soloConReposicion"
          type="checkbox"
          value="si"
          defaultChecked={valores.soloConReposicion}
          className="size-4"
        />
        <label htmlFor="soloConReposicion" className="text-sm font-medium">
          Solo con reposición mayor que 0
        </label>
      </div>
    </Filtros>
  );
}
