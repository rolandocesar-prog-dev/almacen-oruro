import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/sesion";
import { obtenerPersonal } from "@/servicios/personal";
import { modificarPersonalAccion } from "../../acciones";
import { FormularioPersonal } from "../../formulario-personal";

export const metadata = { title: "Editar personal · Almacén Regional Oruro" };

export default async function PaginaEditarPersonal({ params }: { params: Promise<{ id: string }> }) {
  await requerirSesion();
  const idNumerico = Number((await params).id);
  const persona = Number.isInteger(idNumerico) ? await obtenerPersonal(idNumerico) : null;
  if (!persona) notFound();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold sm:text-[28px]">
        Editar a {persona.nombre} {persona.apellido}
      </h1>
      <FormularioPersonal
        modo="edicion"
        accion={modificarPersonalAccion.bind(null, persona.id)}
        valores={persona}
        rutaCancelar={`/personal/${persona.id}`}
      />
    </section>
  );
}
