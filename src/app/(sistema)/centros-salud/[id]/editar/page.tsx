import { notFound } from "next/navigation";
import { idDeRuta } from "@/lib/parametros";
import { requerirSesion } from "@/lib/sesion";
import { obtenerCentroSalud } from "@/servicios/catalogos/centros-salud";
import { modificarCentroSaludAccion } from "../../acciones";
import { FormularioCentroSalud } from "../../formulario-centro-salud";

export const metadata = { title: "Editar centro de salud · Almacén Regional Oruro" };

export default async function PaginaEditarCentroSalud({ params }: { params: Promise<{ id: string }> }) {
  await requerirSesion();
  const id = idDeRuta((await params).id);
  const centro = id ? await obtenerCentroSalud(id) : null;
  if (!centro) notFound();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold sm:text-[28px]">Editar {centro.nombre}</h1>
      <FormularioCentroSalud
        accion={modificarCentroSaludAccion.bind(null, centro.id)}
        valores={centro}
        textoBoton="Guardar cambios"
        rutaCancelar={`/centros-salud/${centro.id}`}
      />
    </section>
  );
}
