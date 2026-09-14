"use client";

import { CampoBusqueda, CampoEstado } from "@/componentes/catalogos/campos-filtro";
import { Filtros } from "@/componentes/ui/filtros";
import { esquemaFiltroCatalogo, type FiltroCatalogo } from "@/esquemas/comunes";

/** Filtros del listado de proveedores, validados con esquemaFiltroCatalogo (principio VI). */
export function FiltrosProveedores({ valores }: { valores: FiltroCatalogo }) {
  return (
    <Filtros esquema={esquemaFiltroCatalogo} accion="/proveedores">
      <CampoBusqueda valor={valores.q} ayuda="Razón social, NIT o contacto" />
      <CampoEstado valor={valores.estado} />
    </Filtros>
  );
}
