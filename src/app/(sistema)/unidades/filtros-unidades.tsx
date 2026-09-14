"use client";

import { CampoBusqueda, CampoEstado } from "@/componentes/catalogos/campos-filtro";
import { Filtros } from "@/componentes/ui/filtros";
import { esquemaFiltroCatalogo, type FiltroCatalogo } from "@/esquemas/comunes";

/** Filtros del listado de unidades de medida, validados con esquemaFiltroCatalogo (principio VI). */
export function FiltrosUnidades({ valores }: { valores: FiltroCatalogo }) {
  return (
    <Filtros esquema={esquemaFiltroCatalogo} accion="/unidades">
      <CampoBusqueda valor={valores.q} ayuda="Nombre o abreviatura" />
      <CampoEstado valor={valores.estado} />
    </Filtros>
  );
}
