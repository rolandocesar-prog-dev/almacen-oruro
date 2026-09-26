import { requerirSesion } from "@/lib/sesion";
import { registrarPersonalAccion } from "../acciones";
import { FormularioPersonal } from "../formulario-personal";

export const metadata = { title: "Registrar personal · Almacén Regional Oruro" };

export default async function PaginaNuevoPersonal() {
  await requerirSesion();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold sm:text-[28px]">Registrar personal</h1>
      <p className="text-sm text-texto-suave">La persona podrá ingresar al sistema con el usuario y la contraseña que indiques.</p>
      <FormularioPersonal modo="registro" accion={registrarPersonalAccion} rutaCancelar="/personal" />
    </section>
  );
}
