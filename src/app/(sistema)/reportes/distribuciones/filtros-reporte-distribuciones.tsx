"use client";

import { Filtros } from "@/componentes/ui/filtros";
import type { OpcionSelector } from "@/componentes/ui/selector";
import { esquemaReporteDistribuciones, type FiltroReporteDistribuciones } from "@/esquemas/reportes";

/** Filtros de R-2, validados con el mismo esquema que usa la página (principio VI). */
export function FiltrosReporteDistribuciones({
  valores,
  representantes,
  productos,
}: {
  valores: FiltroReporteDistribuciones;
  representantes: OpcionSelector[];
  productos: OpcionSelector[];
}) {
  return (
    <Filtros esquema={esquemaReporteDistribuciones} accion="/reportes/distribuciones">
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
        <label htmlFor="representante" className="text-sm font-medium">
          Representante
        </label>
        <select
          id="representante"
          name="representante"
          defaultValue={valores.representante ?? ""}
          className="min-w-0 max-w-full rounded-md border border-borde-campo px-3 py-2"
        >
          <option value="">Todos</option>
          {representantes.map((representante) => (
            <option key={representante.id} value={representante.id}>
              {representante.etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="producto" className="text-sm font-medium">
          Producto
        </label>
        <select id="producto" name="producto" defaultValue={valores.producto ?? ""} className="min-w-0 max-w-full rounded-md border border-borde-campo px-3 py-2">
          <option value="">Todos</option>
          {productos.map((producto) => (
            <option key={producto.id} value={producto.id}>
              {producto.etiqueta}
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
