import { requerirSesion } from "@/lib/sesion";
import { registrarUnidadAccion } from "../acciones";
import { FormularioUnidad } from "../formulario-unidad";

export const metadata = { title: "Registrar unidad de medida · Almacén Regional Oruro" };

export default async function PaginaNuevaUnidad() {
  await requerirSesion();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Registrar unidad de medida</h1>
      <FormularioUnidad accion={registrarUnidadAccion} textoBoton="Registrar" rutaCancelar="/unidades" />
    </section>
  );
}
