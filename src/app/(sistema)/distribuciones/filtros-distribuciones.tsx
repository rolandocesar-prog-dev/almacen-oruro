"use client";

import { Filtros } from "@/componentes/ui/filtros";
import type { OpcionSelector } from "@/componentes/ui/selector";
import { esquemaFiltroDistribuciones, type FiltroDistribuciones } from "@/esquemas/distribuciones";

/** Filtros del listado de distribuciones, validados con esquemaFiltroDistribuciones (principio VI). */
export function FiltrosDistribuciones({
  valores,
  representantes,
  productos,
}: {
  valores: FiltroDistribuciones;
  representantes: OpcionSelector[];
  productos: OpcionSelector[];
}) {
  return (
    <Filtros esquema={esquemaFiltroDistribuciones} accion="/distribuciones">
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
        <label htmlFor="vale" className="text-sm font-medium">
          Nº de vale
        </label>
        <input
          id="vale"
          name="vale"
          inputMode="numeric"
          maxLength={20}
          defaultValue={valores.vale ?? ""}
          placeholder="Empieza con…"
          className="w-40 rounded-md border border-borde-campo px-3 py-2"
        />
      </div>
    </Filtros>
  );
}
