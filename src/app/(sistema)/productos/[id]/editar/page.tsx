import { notFound } from "next/navigation";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { listarCategoriasParaSelector } from "@/servicios/catalogos/categorias";
import { obtenerProducto } from "@/servicios/catalogos/productos";
import { listarUnidadesParaSelector } from "@/servicios/catalogos/unidades-medida";
import { modificarProductoAccion } from "../../acciones";
import { FormularioProducto } from "../../formulario-producto";

export const metadata = { title: "Editar producto · Almacén Regional Oruro" };

export default async function PaginaEditarProducto({ params }: { params: Promise<{ id: string }> }) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const producto = id ? await obtenerProducto(id) : null;
  if (!producto) notFound();

  // Con el id actual, los selectores incluyen la categoría o unidad del producto aunque esté inactiva (FR-003).
  const [categorias, unidades] = await Promise.all([
    listarCategoriasParaSelector(producto.categoriaId),
    listarUnidadesParaSelector(producto.unidadMedidaId),
  ]);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold sm:text-[28px]">
        Editar {producto.codigo} · {producto.nombre}
      </h1>
      <FormularioProducto
        accion={modificarProductoAccion.bind(null, producto.id)}
        categorias={categorias}
        unidades={unidades}
        valores={producto}
        edicion={{ stockActual: producto.stockActual, unidad: producto.unidadMedida.nombre, tieneMovimientos: producto.tieneMovimientos }}
        textoBoton="Guardar cambios"
        rutaCancelar={`/productos/${producto.id}`}
      />
    </section>
  );
}
