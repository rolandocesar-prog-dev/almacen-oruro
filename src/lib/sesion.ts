// Cookie de sesión en el navegador (research R-03, R-15).
import "server-only";
import { cookies } from "next/headers";

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
