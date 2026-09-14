// Cookie de sesión en el navegador y comprobación de sesión (research R-03, R-15).
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validarSesion, type SesionVigente } from "@/servicios/acceso";

export const NOMBRE_COOKIE = "sesion";

// La cookie dura más que la sesión (24 h frente a 8 h). Si venciera a las 8 h, el navegador la
// borraría y el servidor no podría distinguir "sesión expirada" de "nunca ingresó": no mostraría
// el aviso ni registraría la expiración. La vigencia real la decide siempre el servidor.
export const DURACION_COOKIE_HORAS = 24;

/** Escribe la cookie con el token recién generado. Solo en Server Actions. */
export async function escribirCookieSesion(token: string): Promise<void> {
  const almacen = await cookies();
  almacen.set(NOMBRE_COOKIE, token, {
    httpOnly: true, // JavaScript del navegador no puede leerla
    sameSite: "lax", // no se envía desde otros sitios (protección CSRF)
    path: "/",
    secure: process.env.COOKIE_SEGURA === "true", // solo con https (R-15)
    maxAge: DURACION_COOKIE_HORAS * 60 * 60,
  });
}

/** Lee el token de la cookie, si existe. */
export async function leerTokenDeCookie(): Promise<string | undefined> {
  const almacen = await cookies();
  return almacen.get(NOMBRE_COOKIE)?.value;
}

/** Borra la cookie. Solo en Server Actions. */
export async function borrarCookieSesion(): Promise<void> {
  const almacen = await cookies();
  almacen.delete(NOMBRE_COOKIE);
}

/**
 * Valida la sesión de la solicitud actual. `cache()` hace que, aunque el layout, la página y sus
 * componentes la pidan varias veces, la base se consulte una sola vez por solicitud.
 */
const validarSesionDeLaSolicitud = cache(async () => {
  const token = await leerTokenDeCookie();
  if (!token) return { estado: "inexistente" } as const;
  return validarSesion(token);
});

/**
 * Exige una sesión vigente. Va al inicio de TODA página y Server Action del sistema, salvo
 * `salir()` (FR-004). Sin sesión vigente, redirige al inicio de sesión.
 *
 * Si la persona tiene pendiente cambiar su contraseña (usuario inicial o restablecimiento), la
 * lleva a /cambiar-contrasena, salvo en esa misma pantalla y en el layout (FR-021).
 */
export async function requerirSesion({ permitirCambioPendiente = false } = {}): Promise<SesionVigente> {
  const resultado = await validarSesionDeLaSolicitud();
  if (resultado.estado === "expirada") {
    // La página de ingreso muestra "Tu sesión expiró" (Historia 2, escenario 2).
    redirect("/ingreso?expirada=1");
  }
  if (resultado.estado !== "vigente") {
    redirect("/ingreso");
  }
  if (resultado.sesion.usuario.debeCambiarContrasena && !permitirCambioPendiente) {
    redirect("/cambiar-contrasena");
  }
  return resultado.sesion;
}

/** Devuelve la sesión vigente o null, sin redirigir. Para la página de ingreso. */
export async function obtenerSesionOpcional(): Promise<SesionVigente | null> {
  const resultado = await validarSesionDeLaSolicitud();
  return resultado.estado === "vigente" ? resultado.sesion : null;
}
