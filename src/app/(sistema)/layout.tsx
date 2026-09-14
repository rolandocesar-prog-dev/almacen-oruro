import Link from "next/link";
import { requerirSesion } from "@/lib/sesion";
import { salir } from "./acciones-sesion";

// Estructura común de las páginas del sistema: encabezado, usuario y menú.
// La comprobación de sesión se repite también en cada página y acción: el layout no se vuelve a
// ejecutar al navegar entre páginas, así que no alcanza como única protección (FR-004).
export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  const { usuario } = await requerirSesion();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-marca text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="text-lg font-semibold">
            Almacén Regional Oruro
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span>
              {usuario.nombre} {usuario.apellido}
            </span>
            <form action={salir}>
              <button type="submit" className="rounded-md border border-white px-3 py-1 hover:bg-white hover:text-marca">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Menú principal" className="bg-marca-oscuro">
          <ul className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 text-sm">
            <li>
              <Link href="/" className="block px-3 py-2 hover:bg-marca">
                Inicio
              </Link>
            </li>
            <li>
              <Link href="/personal" className="block px-3 py-2 hover:bg-marca">
                Personal
              </Link>
            </li>
            <li>
              <Link href="/sesiones" className="block px-3 py-2 hover:bg-marca">
                Sesiones
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
