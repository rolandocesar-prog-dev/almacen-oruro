import Link from "next/link";
import { requerirSesion } from "@/lib/sesion";
import { salir } from "./acciones-sesion";

const menu = [
  { ruta: "/", texto: "Inicio" },
  { ruta: "/compras", texto: "Compras" },
  { ruta: "/pedidos", texto: "Pedidos" },
  { ruta: "/existencias", texto: "Existencias" },
  { ruta: "/personal", texto: "Personal" },
  { ruta: "/sesiones", texto: "Sesiones" },
  { ruta: "/cambiar-contrasena", texto: "Cambiar mi contraseña" },
] as const;

// Los catálogos van agrupados en una segunda fila del menú; en pantallas chicas los enlaces pasan a
// varias líneas sin desplazamiento horizontal (F-002, research C-10).
const menuCatalogos = [
  { ruta: "/productos", texto: "Productos" },
  { ruta: "/categorias", texto: "Categorías" },
  { ruta: "/unidades", texto: "Unidades" },
  { ruta: "/proveedores", texto: "Proveedores" },
  { ruta: "/centros-salud", texto: "Centros de salud" },
  { ruta: "/representantes", texto: "Representantes" },
] as const;

// Estructura común de las páginas del sistema: encabezado, usuario y menú.
// La comprobación de sesión se repite también en cada página y acción: el layout no se vuelve a
// ejecutar al navegar entre páginas, así que no alcanza como única protección (FR-004).
export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  // El layout permite el cambio pendiente: si no, la pantalla /cambiar-contrasena nunca se mostraría.
  const { usuario } = await requerirSesion({ permitirCambioPendiente: true });

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
        {/* Con el cambio de contraseña pendiente solo se puede cambiarla o cerrar sesión: no hay menú. */}
        {!usuario.debeCambiarContrasena && (
          <nav aria-label="Menú principal" className="bg-marca-oscuro">
            <ul className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 text-sm">
              {menu.map((opcion) => (
                <li key={opcion.ruta}>
                  <Link href={opcion.ruta} className="block px-3 py-2 hover:bg-marca">
                    {opcion.texto}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-t border-marca">
              <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 text-sm">
                <span id="menu-catalogos" className="px-3 py-2 font-semibold">
                  Catálogos:
                </span>
                <ul aria-labelledby="menu-catalogos" className="flex flex-wrap gap-1">
                  {menuCatalogos.map((opcion) => (
                    <li key={opcion.ruta}>
                      <Link href={opcion.ruta} className="block px-3 py-2 hover:bg-marca">
                        {opcion.texto}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
