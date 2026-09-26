"use client";

import { Filtros } from "@/componentes/ui/filtros";
import type { OpcionSelector } from "@/componentes/ui/selector";
import { esquemaReporteCompras, type FiltroReporteCompras } from "@/esquemas/reportes";

/** Filtros de R-1, validados con el mismo esquema que usa la página (principio VI). */
export function FiltrosReporteCompras({ valores, proveedores }: { valores: FiltroReporteCompras; proveedores: OpcionSelector[] }) {
  return (
    <Filtros esquema={esquemaReporteCompras} accion="/reportes/compras">
      <div className="flex flex-col gap-1">
        <label htmlFor="desde" className="text-sm font-medium">
          Desde
        </label>
        <input id="desde" name="desde" type="date" defaultValue={valores.desde} className="rounded-md border border-borde-campo px-3 py-2" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="hasta" className="text-sm font-medium">
          Hasta
        </label>
        <input id="hasta" name="hasta" type="date" defaultValue={valores.hasta} className="rounded-md border border-borde-campo px-3 py-2" />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="proveedor" className="text-sm font-medium">
          Proveedor
        </label>
        <select id="proveedor" name="proveedor" defaultValue={valores.proveedor ?? ""} className="min-w-0 max-w-full rounded-md border border-borde-campo px-3 py-2">
          <option value="">Todos</option>
          {proveedores.map((proveedor) => (
            <option key={proveedor.id} value={proveedor.id}>
              {proveedor.etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 py-2">
        <input id="incluirAnulados" name="incluirAnulados" type="checkbox" value="si" defaultChecked={valores.incluirAnulados} className="size-4" />
        <label htmlFor="incluirAnulados" className="text-sm font-medium">
          Incluir anuladas
        </label>
      </div>
    </Filtros>
  );
}
