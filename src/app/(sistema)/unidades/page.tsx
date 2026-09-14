import Link from "next/link";
import { EncabezadoListado } from "@/componentes/catalogos/encabezado-listado";
import { InsigniaActivo } from "@/componentes/catalogos/insignia-estado";
import { MensajeVacio } from "@/componentes/catalogos/mensaje-vacio";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaFiltroCatalogo, type FiltroCatalogo } from "@/esquemas/comunes";
import { requerirSesion } from "@/lib/sesion";
import { listarUnidadesMedida } from "@/servicios/catalogos/unidades-medida";
import { FiltrosUnidades } from "./filtros-unidades";

export const metadata = { title: "Unidades de medida · Almacén Regional Oruro" };

export default async function PaginaUnidades({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();

  // Mismo esquema que el formulario de filtros; un valor inválido en la URL usa los valores por defecto.
  const validacion = esquemaFiltroCatalogo.safeParse(await searchParams);
  const filtro: FiltroCatalogo = validacion.success ? validacion.data : { estado: "activos" };
  const unidades = await listarUnidadesMedida(filtro);

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoListado
        titulo="Unidades de medida"
        total={unidades.length === 1 ? "1 unidad de medida" : `${unidades.length} unidades de medida`}
        rutaAlta="/unidades/nueva"
        textoAlta="Registrar unidad"
      />
      <FiltrosUnidades valores={filtro} />
      <Tabla
        encabezados={["Nombre", "Abreviatura", "Productos activos", "Estado", ""]}
        vacio={
          unidades.length === 0 ? (
            <MensajeVacio q={filtro.q} rutaLimpiar={`/unidades?estado=${filtro.estado}`} sinRegistros="No hay unidades de medida para los filtros aplicados" />
          ) : undefined
        }
      >
        {unidades.map((unidad) => (
          <tr key={unidad.id}>
            <Celda>{unidad.nombre}</Celda>
            <Celda>{unidad.abreviatura}</Celda>
            <Celda>{unidad.productosActivos}</Celda>
            <Celda>
              <InsigniaActivo activo={unidad.activo} />
            </Celda>
            <Celda>
              <Link href={`/unidades/${unidad.id}`} className="text-marca underline">
                Ver ficha
              </Link>
            </Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
