import { notFound } from "next/navigation";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerUnidadMedida } from "@/servicios/catalogos/unidades-medida";
import { modificarUnidadAccion } from "../../acciones";
import { FormularioUnidad } from "../../formulario-unidad";

export const metadata = { title: "Editar unidad de medida · Almacén Regional Oruro" };

export default async function PaginaEditarUnidad({ params }: { params: Promise<{ id: string }> }) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const unidad = id ? await obtenerUnidadMedida(id) : null;
  if (!unidad) notFound();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold sm:text-[28px]">Editar la unidad {unidad.nombre}</h1>
      <FormularioUnidad
        accion={modificarUnidadAccion.bind(null, unidad.id)}
        valores={unidad}
        textoBoton="Guardar cambios"
        rutaCancelar={`/unidades/${unidad.id}`}
      />
    </section>
  );
}
