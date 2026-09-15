import Link from "next/link";
import { InsigniaEstado } from "@/componentes/catalogos/insignia-estado";
import { MensajeVacio } from "@/componentes/catalogos/mensaje-vacio";
import { Celda, Tabla } from "@/componentes/ui/tabla";
import { esquemaFiltroExistencias } from "@/esquemas/inventario";
import { requerirSesion } from "@/lib/sesion";
import { listarCategorias } from "@/servicios/catalogos/categorias";
import { listarExistencias } from "@/servicios/inventario";
import { FiltrosExistencias } from "./filtros-existencias";

export const metadata = { title: "Existencias · Almacén Regional Oruro" };

export default async function PaginaExistencias({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  await requerirSesion();

  // Mismo esquema que el formulario de filtros; cada valor inválido toma su valor por defecto.
  const filtro = esquemaFiltroExistencias.safeParse(await searchParams).data ?? { estado: "habituales" as const };
  const [existencias, categorias] = await Promise.all([
    listarExistencias({ q: filtro.q, categoriaId: filtro.categoria, estado: filtro.estado, soloBajoMinimo: filtro.bajoMinimo === "si" }),
    listarCategorias({ estado: "todos" }),
  ]);

  const parametrosSinBusqueda = new URLSearchParams({ estado: filtro.estado });
  if (filtro.categoria) parametrosSinBusqueda.set("categoria", String(filtro.categoria));
  if (filtro.bajoMinimo) parametrosSinBusqueda.set("bajoMinimo", "si");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Existencias</h1>
          {/* SC-007: cuántos están bajo mínimo se ve sin buscar. */}
          <p className="text-sm text-gray-600">
            {existencias.total === 1 ? "1 producto" : `${existencias.total} productos`} ·{" "}
            <strong className={existencias.bajoMinimo > 0 ? "text-aviso" : ""}>{existencias.bajoMinimo} bajo mínimo</strong>
          </p>
        </div>
        <Link href="/existencias/verificacion" className="rounded-md border border-marca bg-white px-4 py-2 text-sm font-medium text-marca hover:bg-fondo">
          Verificar consistencia
        </Link>
      </div>

      <FiltrosExistencias
        valores={filtro}
        categorias={categorias.map((c) => ({ id: c.id, etiqueta: c.activo ? c.nombre : `${c.nombre} (inactiva)` }))}
      />

      <Tabla
        encabezados={["Código", "Producto", "Categoría", "Unidad", "Stock actual", "Stock mínimo", "Indicador", ""]}
        vacio={
          existencias.total === 0 ? (
            <MensajeVacio q={filtro.q} rutaLimpiar={`/existencias?${parametrosSinBusqueda.toString()}`} sinRegistros="No hay productos para los filtros aplicados" />
          ) : undefined
        }
      >
        {existencias.productos.map((producto) => (
          // La fila bajo mínimo se resalta con fondo y además con la insignia de texto: no depende solo del color.
          <tr key={producto.id} className={producto.bajoMinimo ? "bg-amber-50" : undefined}>
            <Celda>{producto.codigo}</Celda>
            <Celda>{producto.nombre}</Celda>
            <Celda>{producto.categoria}</Celda>
            <Celda>{producto.unidad}</Celda>
            <Celda className="text-right tabular-nums">{producto.stockActual}</Celda>
            <Celda className="text-right tabular-nums">{producto.stockMinimo}</Celda>
            <Celda>
              <span className="flex gap-1">
                {producto.bajoMinimo && <InsigniaEstado variante="bajoMinimo" />}
                {!producto.activo && <InsigniaEstado variante="inactivo" />}
              </span>
            </Celda>
            <Celda>
              <Link href={`/kardex/${producto.id}`} className="text-marca underline">
                Ver kardex
              </Link>
            </Celda>
          </tr>
        ))}
      </Tabla>
    </section>
  );
}
