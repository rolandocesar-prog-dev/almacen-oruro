"use client";

import { Filtros } from "@/componentes/ui/filtros";
import type { OpcionSelector } from "@/componentes/ui/selector";
import { esquemaReporteExistencias, type FiltroReporteExistencias } from "@/esquemas/reportes";

/** Filtros de R-3: categoría y "solo bajo mínimo". No lleva fechas (Historia 3 · E4). */
export function FiltrosReporteExistencias({ valores, categorias }: { valores: FiltroReporteExistencias; categorias: OpcionSelector[] }) {
  return (
    <Filtros esquema={esquemaReporteExistencias} accion="/reportes/existencias">
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="categoria" className="text-sm font-medium">
          Categoría
        </label>
        <select id="categoria" name="categoria" defaultValue={valores.categoria ?? ""} className="min-w-0 max-w-full rounded-md border border-borde-campo px-3 py-2">
          <option value="">Todas</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 py-2">
        <input id="soloBajoMinimo" name="soloBajoMinimo" type="checkbox" value="si" defaultChecked={valores.soloBajoMinimo} className="size-4" />
        <label htmlFor="soloBajoMinimo" className="text-sm font-medium">
          Solo bajo mínimo
        </label>
      </div>
    </Filtros>
  );
}
