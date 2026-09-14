"use server";

import { redirect } from "next/navigation";
import { borrarCookieSesion, leerTokenDeCookie } from "@/lib/sesion";
import { cerrarSesion } from "@/servicios/acceso";

/**
 * Cerrar sesión (FR-006).
 *
 * Es la única acción del sistema que NO llama a requerirSesion(): tiene que funcionar aunque la
 * sesión ya esté vencida o la persona tenga pendiente cambiar su contraseña (caso borde
 * "Cambio obligatorio pendiente").
 */
export async function salir(): Promise<void> {
  const token = await leerTokenDeCookie();
  if (token) {
    await cerrarSesion(token);
  }
  await borrarCookieSesion();
  redirect("/ingreso");
}
