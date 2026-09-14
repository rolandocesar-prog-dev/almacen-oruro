import Link from "next/link";
import { EncabezadoListado } from "@/componentes/catalogos/encabezado-listado";
import { InsigniaActivo, InsigniaEstado } from "@/componentes/catalogos/insignia-estado";
import { MensajeVacio } from "@/componentes/catalogos/mensaje-vacio";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaFiltroProductos, type FiltroProductos } from "@/esquemas/catalogos/producto";
import { requerirSesion } from "@/lib/sesion";
import { listarCategorias } from "@/servicios/catalogos/categorias";
import { listarProductos } from "@/servicios/catalogos/productos";
import { FiltrosProductos } from "./filtros-productos";

export const metadata = { title: "Productos · Almacén Regional Oruro" };

export default async function PaginaProductos({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();

  // Mismo esquema que el formulario de filtros; un valor inválido en la URL usa los valores por defecto.
  const validacion = esquemaFiltroProductos.safeParse(await searchParams);
  const filtro: FiltroProductos = validacion.success ? validacion.data : { estado: "activos" };
  const [productos, categorias] = await Promise.all([
    listarProductos({ q: filtro.q, estado: filtro.estado, categoriaId: filtro.categoria }),
    listarCategorias({ estado: "todos" }),
  ]);

  const rutaLimpiar = `/productos?estado=${filtro.estado}${filtro.categoria ? `&categoria=${filtro.categoria}` : ""}`;

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoListado
        titulo="Productos"
        total={productos.length === 1 ? "1 producto" : `${productos.length} productos`}
        rutaAlta="/productos/nuevo"
        textoAlta="Registrar producto"
      />
      <FiltrosProductos
        valores={filtro}
        categorias={categorias.map((c) => ({ id: c.id, etiqueta: c.activo ? c.nombre : `${c.nombre} (inactiva)` }))}
      />
      <Tabla
        encabezados={["Código", "Nombre", "Categoría", "Unidad", "Stock actual", "Stock mínimo", "Estado", ""]}
        vacio={
          productos.length === 0 ? (
            <MensajeVacio q={filtro.q} rutaLimpiar={rutaLimpiar} sinRegistros="No hay productos para los filtros aplicados" />
          ) : undefined
        }
      >
        {productos.map((producto) => (
          <tr key={producto.id}>
            <Celda>{producto.codigo}</Celda>
            <Celda>{producto.nombre}</Celda>
            <Celda>{producto.categoria}</Celda>
            <Celda>{producto.unidad}</Celda>
            <Celda className="text-right">{producto.stockActual}</Celda>
            <Celda className="text-right">{producto.stockMinimo}</Celda>
            <Celda>
              <span className="flex gap-1">
                <InsigniaActivo activo={producto.activo} />
                {producto.bajoMinimo && <InsigniaEstado variante="bajoMinimo" />}
              </span>
            </Celda>
            <Celda>
              <Link href={`/productos/${producto.id}`} className="text-marca underline">
                Ver ficha
              </Link>
            </Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
