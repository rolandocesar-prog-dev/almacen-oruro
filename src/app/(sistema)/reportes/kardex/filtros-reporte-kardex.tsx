"use client";

import { Filtros } from "@/componentes/ui/filtros";
import type { OpcionSelector } from "@/componentes/ui/selector";
import { esquemaReporteKardex, type FiltroReporteKardex } from "@/esquemas/reportes";

/** Filtros de R-4: el producto es obligatorio para ver el kardex (Historia 4 · E3). */
export function FiltrosReporteKardex({ valores, productos }: { valores: FiltroReporteKardex; productos: OpcionSelector[] }) {
  return (
    <Filtros esquema={esquemaReporteKardex} accion="/reportes/kardex">
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="producto" className="text-sm font-medium">
          Producto
        </label>
        <select id="producto" name="producto" defaultValue={valores.producto ?? ""} className="min-w-0 max-w-full rounded-md border border-borde px-3 py-2">
          <option value="">Elige un producto</option>
          {productos.map((producto) => (
            <option key={producto.id} value={producto.id}>
              {producto.etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="desde" className="text-sm font-medium">
          Desde
        </label>
        <input id="desde" name="desde" type="date" defaultValue={valores.desde} className="rounded-md border border-borde px-3 py-2" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="hasta" className="text-sm font-medium">
          Hasta
        </label>
        <input id="hasta" name="hasta" type="date" defaultValue={valores.hasta} className="rounded-md border border-borde px-3 py-2" />
      </div>
    </Filtros>
  );
}
