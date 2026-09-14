"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { esquemaIngreso } from "@/esquemas/acceso";
import { aResultadoDeError, aResultadoDeValidacion, type ResultadoAccion } from "@/lib/errores";
import { escribirCookieSesion } from "@/lib/sesion";
import { iniciarSesion } from "@/servicios/acceso";

/** Ingreso al sistema (contracts/acciones-f001.md, `ingresar`). */
export async function ingresar(_estadoPrevio: ResultadoAccion | undefined, formData: FormData): Promise<ResultadoAccion> {
  // 1. Validar con el mismo esquema que el formulario.
  const validacion = esquemaIngreso.safeParse(Object.fromEntries(formData));
  if (!validacion.success) {
    return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);
  }

  // 2. Aplicar la regla de negocio.
  let destino: string;
  try {
    const { token, debeCambiarContrasena } = await iniciarSesion(validacion.data.nombreUsuario, validacion.data.contrasena);
    await escribirCookieSesion(token);
    // Con contraseña inicial o temporal, primero debe definir una nueva (FR-021).
    destino = debeCambiarContrasena ? "/cambiar-contrasena" : "/";
  } catch (error) {
    return aResultadoDeError(error);
  }

  // 3. redirect() se llama fuera del try: internamente lanza una excepción que Next.js necesita recibir.
  redirect(destino);
}
