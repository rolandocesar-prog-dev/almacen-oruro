"use client";

import { CampoBusqueda, CampoEstado } from "@/componentes/catalogos/campos-filtro";
import { Filtros } from "@/componentes/ui/filtros";
import { esquemaFiltroCatalogo, type FiltroCatalogo } from "@/esquemas/comunes";

/** Filtros del listado de centros de salud, validados con esquemaFiltroCatalogo (principio VI). */
export function FiltrosCentrosSalud({ valores }: { valores: FiltroCatalogo }) {
  return (
    <Filtros esquema={esquemaFiltroCatalogo} accion="/centros-salud">
      <CampoBusqueda valor={valores.q} ayuda="Nombre" />
      <CampoEstado valor={valores.estado} />
    </Filtros>
  );
}
