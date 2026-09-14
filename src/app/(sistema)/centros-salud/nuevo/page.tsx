import { requerirSesion } from "@/lib/sesion";
import { registrarCentroSaludAccion } from "../acciones";
import { FormularioCentroSalud } from "../formulario-centro-salud";

export const metadata = { title: "Registrar centro de salud · Almacén Regional Oruro" };

export default async function PaginaNuevoCentroSalud() {
  await requerirSesion();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Registrar centro de salud</h1>
      <FormularioCentroSalud accion={registrarCentroSaludAccion} textoBoton="Registrar" rutaCancelar="/centros-salud" />
    </section>
  );
}
