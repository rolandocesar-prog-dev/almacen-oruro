"use client";

import { CampoBusqueda, CampoEstado } from "@/componentes/catalogos/campos-filtro";
import { Filtros } from "@/componentes/ui/filtros";
import { esquemaFiltroCatalogo, type FiltroCatalogo } from "@/esquemas/comunes";

/** Filtros del listado de categorías, validados con esquemaFiltroCatalogo (principio VI). */
export function FiltrosCategorias({ valores }: { valores: FiltroCatalogo }) {
  return (
    <Filtros esquema={esquemaFiltroCatalogo} accion="/categorias">
      <CampoBusqueda valor={valores.q} ayuda="Nombre o descripción" />
      <CampoEstado valor={valores.estado} />
    </Filtros>
  );
}
