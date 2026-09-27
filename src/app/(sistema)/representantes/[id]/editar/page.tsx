import { notFound } from "next/navigation";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { listarCentrosParaRepresentante } from "@/servicios/catalogos/centros-salud";
import { obtenerRepresentante } from "@/servicios/catalogos/representantes";
import { modificarRepresentanteAccion } from "../../acciones";
import { FormularioRepresentante } from "../../formulario-representante";

export const metadata = { title: "Editar representante · Almacén Regional Oruro" };

export default async function PaginaEditarRepresentante({ params }: { params: Promise<{ id: string }> }) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const representante = id ? await obtenerRepresentante(id) : null;
  if (!representante) notFound();

  // Centros libres más el actual del representante, aunque esté inactivo (FR-005; FR-003 de F-002).
  const centros = await listarCentrosParaRepresentante(representante.id);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold sm:text-[28px]">
        Editar a {representante.nombre} {representante.apellido}
      </h1>
      <FormularioRepresentante
        accion={modificarRepresentanteAccion.bind(null, representante.id)}
        centros={centros}
        valores={representante}
        textoBoton="Guardar cambios"
        rutaCancelar={`/representantes/${representante.id}`}
      />
    </section>
  );
}
