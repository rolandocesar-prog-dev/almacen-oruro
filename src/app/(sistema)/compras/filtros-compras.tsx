"use client";

import { Filtros } from "@/componentes/ui/filtros";
import type { OpcionSelector } from "@/componentes/ui/selector";
import { esquemaFiltroCompras, type FiltroCompras } from "@/esquemas/compras";

/** Filtros del listado de compras, validados con esquemaFiltroCompras (principio VI). */
export function FiltrosCompras({ valores, proveedores }: { valores: FiltroCompras; proveedores: OpcionSelector[] }) {
  return (
    <Filtros esquema={esquemaFiltroCompras} accion="/compras">
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
        <select id="proveedor" name="proveedor" defaultValue={valores.proveedor ?? ""} className="min-w-0 rounded-md border border-borde-campo px-3 py-2">
          <option value="">Todos</option>
          {proveedores.map((proveedor) => (
            <option key={proveedor.id} value={proveedor.id}>
              {proveedor.etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="estado" className="text-sm font-medium">
          Estado
        </label>
        <select id="estado" name="estado" defaultValue={valores.estado} className="rounded-md border border-borde-campo px-3 py-2">
          <option value="todas">Todas</option>
          <option value="registradas">Registradas</option>
          <option value="anuladas">Anuladas</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="factura" className="text-sm font-medium">
          Nº de factura
        </label>
        <input
          id="factura"
          name="factura"
          inputMode="numeric"
          maxLength={20}
          defaultValue={valores.factura ?? ""}
          placeholder="Empieza con…"
          className="w-40 rounded-md border border-borde-campo px-3 py-2"
        />
      </div>
    </Filtros>
  );
}
