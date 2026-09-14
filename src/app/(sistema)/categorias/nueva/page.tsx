import { requerirSesion } from "@/lib/sesion";
import { registrarCategoriaAccion } from "../acciones";
import { FormularioCategoria } from "../formulario-categoria";

export const metadata = { title: "Registrar categoría · Almacén Regional Oruro" };

export default async function PaginaNuevaCategoria() {
  await requerirSesion();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Registrar categoría</h1>
      <FormularioCategoria accion={registrarCategoriaAccion} textoBoton="Registrar" rutaCancelar="/categorias" />
    </section>
  );
}
