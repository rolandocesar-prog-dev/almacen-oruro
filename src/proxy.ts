// Comprobación OPTIMISTA de sesión (contracts/rutas.md, research R-03).
//
// Solo mira si existe la cookie: sin cookie, cualquier ruta del sistema redirige al ingreso.
// No consulta la base, porque se ejecuta en cada solicitud (incluso las precargas de enlaces).
// La comprobación que vale es requerirSesion(), que cada página y acción ejecuta junto a los datos.
import { NextResponse, type NextRequest } from "next/server";

const NOMBRE_COOKIE = "sesion";

export default function proxy(solicitud: NextRequest) {
  const ruta = solicitud.nextUrl.pathname;
  const esRutaPublica = ruta === "/ingreso" || ruta.startsWith("/ingreso/");
  const tieneCookie = solicitud.cookies.has(NOMBRE_COOKIE);

  if (!esRutaPublica && !tieneCookie) {
    return NextResponse.redirect(new URL("/ingreso", solicitud.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // No se ejecuta para los archivos estáticos de Next.js ni el ícono.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
