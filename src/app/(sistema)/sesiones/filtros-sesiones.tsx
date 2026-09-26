"use client";

import { Filtros } from "@/componentes/ui/filtros";
import { esquemaFiltroSesiones, type FiltroSesiones } from "@/esquemas/acceso";

type Props = {
  valores: FiltroSesiones;
  personas: { id: number; nombreCompleto: string; activo: boolean }[];
};

/** Filtros del historial de sesiones, validados con esquemaFiltroSesiones (principio VI). */
export function FiltrosSesiones({ valores, personas }: Props) {
  return (
    <Filtros esquema={esquemaFiltroSesiones} accion="/sesiones">
      <div className="flex flex-col gap-1">
        <label htmlFor="usuario" className="text-sm font-medium">
          Persona
        </label>
        <select id="usuario" name="usuario" defaultValue={valores.usuario ?? ""} className="rounded-md border border-borde-campo px-3 py-2">
          <option value="">Todas</option>
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.nombreCompleto}
              {persona.activo ? "" : " (inactivo)"}
            </option>
          ))}
        </select>
      </div>
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
    </Filtros>
  );
}
