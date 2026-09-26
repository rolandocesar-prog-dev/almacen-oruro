import Link from "next/link";
import { MenuLateral } from "@/componentes/navegacion/menu-lateral";
import { Icono } from "@/componentes/ui/icono";
import { requerirSesion } from "@/lib/sesion";
import { obtenerConfiguracion } from "@/servicios/configuracion";
import { salir } from "./acciones-sesion";

// Estructura común de las páginas del sistema: menú lateral con el usuario y el contenido.
// La comprobación de sesión se repite también en cada página y acción: el layout no se vuelve a
// ejecutar al navegar entre páginas, así que no alcanza como única protección (FR-004).
export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  // El layout permite el cambio pendiente: si no, la pantalla /cambiar-contrasena nunca se mostraría.
  const { usuario } = await requerirSesion({ permitirCambioPendiente: true });
  // La marca vale para toda la base y la pone el generador de F-007: mientras esté encendida, ninguna
  // pantalla puede confundirse con datos reales (D-07, aclaración de F-006 del 13/09).
  const { modoDemostracion } = await obtenerConfiguracion();
  const conMenu = !usuario.debeCambiarContrasena;
  const iniciales = `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase();

  const pie = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-marca-gris text-xs font-bold text-marca-oscuro">
          {iniciales}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {usuario.nombre} {usuario.apellido}
        </span>
        {conMenu && (
          <Link
            href="/cambiar-contrasena"
            aria-label="Cambiar mi contraseña"
            title="Cambiar mi contraseña"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/35 hover:bg-white/10"
          >
            <Icono nombre="contrasena" className="size-[18px]" />
          </Link>
        )}
      </div>
      <form action={salir}>
        <button
          type="submit"
          className="flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-marca hover:bg-marca-claro"
        >
          <Icono nombre="salir" className="size-4" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <MenuLateral conMenu={conMenu} pie={pie} />
      <div className="flex min-w-0 flex-1 flex-col">
        {modoDemostracion && (
          <p className="bg-aviso-claro px-4 py-2 text-center text-sm font-semibold text-aviso" role="status">
            Datos simulados con fines de demostración
          </p>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
