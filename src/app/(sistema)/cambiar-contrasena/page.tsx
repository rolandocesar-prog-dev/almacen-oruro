import { Aviso } from "@/componentes/ui/aviso";
import { requerirSesion } from "@/lib/sesion";
import { FormularioCambioContrasena } from "./formulario";

export const metadata = { title: "Cambiar mi contraseña · Almacén Regional Oruro" };

export default async function PaginaCambiarContrasena() {
  // Esta es la única página que se puede abrir con el cambio de contraseña pendiente (FR-021).
  const { usuario } = await requerirSesion({ permitirCambioPendiente: true });

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold sm:text-[28px]">Cambiar mi contraseña</h1>
      {usuario.debeCambiarContrasena && (
        <Aviso tipo="informacion">
          Debes definir una contraseña nueva antes de continuar. En &quot;Contraseña actual&quot; escribe la que usaste para ingresar.
        </Aviso>
      )}
      <FormularioCambioContrasena />
    </section>
  );
}
