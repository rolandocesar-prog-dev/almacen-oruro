"use client";

import { CampoBusqueda, CampoEstado } from "@/componentes/catalogos/campos-filtro";
import { Filtros } from "@/componentes/ui/filtros";
import { esquemaFiltroCatalogo, type FiltroCatalogo } from "@/esquemas/comunes";

/** Filtros del listado de representantes, validados con esquemaFiltroCatalogo (principio VI). */
export function FiltrosRepresentantes({ valores }: { valores: FiltroCatalogo }) {
  return (
    <Filtros esquema={esquemaFiltroCatalogo} accion="/representantes">
      <CampoBusqueda valor={valores.q} ayuda="Nombre, apellido, CI o centro de salud" />
      <CampoEstado valor={valores.estado} />
    </Filtros>
  );
}
