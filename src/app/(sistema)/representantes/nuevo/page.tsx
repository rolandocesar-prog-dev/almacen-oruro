import { requerirSesion } from "@/lib/sesion";
import { listarCentrosSaludParaSelector } from "@/servicios/catalogos/centros-salud";
import { registrarRepresentanteAccion } from "../acciones";
import { FormularioRepresentante } from "../formulario-representante";

export const metadata = { title: "Registrar representante · Almacén Regional Oruro" };

export default async function PaginaNuevoRepresentante() {
  await requerirSesion();
  const centros = await listarCentrosSaludParaSelector();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold sm:text-[28px]">Registrar representante</h1>
      <FormularioRepresentante accion={registrarRepresentanteAccion} centros={centros} textoBoton="Registrar" rutaCancelar="/representantes" />
    </section>
  );
}
