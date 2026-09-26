import { notFound } from "next/navigation";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerCategoria } from "@/servicios/catalogos/categorias";
import { modificarCategoriaAccion } from "../../acciones";
import { FormularioCategoria } from "../../formulario-categoria";

export const metadata = { title: "Editar categoría · Almacén Regional Oruro" };

export default async function PaginaEditarCategoria({ params }: { params: Promise<{ id: string }> }) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const categoria = id ? await obtenerCategoria(id) : null;
  if (!categoria) notFound();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold sm:text-[28px]">Editar la categoría {categoria.nombre}</h1>
      <FormularioCategoria
        accion={modificarCategoriaAccion.bind(null, categoria.id)}
        valores={categoria}
        textoBoton="Guardar cambios"
        rutaCancelar={`/categorias/${categoria.id}`}
      />
    </section>
  );
}
