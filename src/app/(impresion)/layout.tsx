import { requerirSesion } from "@/lib/sesion";

// Páginas para imprimir (F-005, research V-09): una hoja en blanco, sin el menú del sistema. El grupo de
// rutas no cambia la URL: el vale sigue en /distribuciones/[id]/vale, la ruta reservada en F-001.
// La sesión se exige aquí y también en cada página, como en el resto del sistema (FR-004 de F-001).
export default async function LayoutImpresion({ children }: { children: React.ReactNode }) {
  await requerirSesion();

  return <main className="mx-auto w-full max-w-3xl bg-white px-6 py-8 print:max-w-none print:p-0">{children}</main>;
}
