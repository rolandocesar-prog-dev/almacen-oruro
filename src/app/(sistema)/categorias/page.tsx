import Link from "next/link";
import { EncabezadoListado } from "@/componentes/catalogos/encabezado-listado";
import { InsigniaActivo } from "@/componentes/catalogos/insignia-estado";
import { MensajeVacio } from "@/componentes/catalogos/mensaje-vacio";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaFiltroCatalogo, type FiltroCatalogo } from "@/esquemas/comunes";
import { requerirSesion } from "@/lib/sesion";
import { listarCategorias } from "@/servicios/catalogos/categorias";
import { FiltrosCategorias } from "./filtros-categorias";

export const metadata = { title: "Categorías · Almacén Regional Oruro" };

export default async function PaginaCategorias({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();

  // Mismo esquema que el formulario de filtros; un valor inválido en la URL usa los valores por defecto.
  const validacion = esquemaFiltroCatalogo.safeParse(await searchParams);
  const filtro: FiltroCatalogo = validacion.success ? validacion.data : { estado: "activos" };
  const categorias = await listarCategorias(filtro);

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoListado
        titulo="Categorías"
        total={categorias.length === 1 ? "1 categoría" : `${categorias.length} categorías`}
        rutaAlta="/categorias/nueva"
        textoAlta="Registrar categoría"
      />
      <FiltrosCategorias valores={filtro} />
      <Tabla
        encabezados={["Nombre", "Descripción", "Productos activos", "Estado", ""]}
        vacio={
          categorias.length === 0 ? (
            <MensajeVacio q={filtro.q} rutaLimpiar={`/categorias?estado=${filtro.estado}`} sinRegistros="No hay categorías para los filtros aplicados" />
          ) : undefined
        }
      >
        {categorias.map((categoria) => (
          <tr key={categoria.id}>
            <Celda>{categoria.nombre}</Celda>
            <Celda className="whitespace-normal">{categoria.descripcion ?? "—"}</Celda>
            <Celda>{categoria.productosActivos}</Celda>
            <Celda>
              <InsigniaActivo activo={categoria.activo} />
            </Celda>
            <Celda>
              <Link href={`/categorias/${categoria.id}`} className="text-marca underline">
                Ver ficha
              </Link>
            </Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
