"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { esquemaCambioContrasena } from "@/esquemas/personal";
import { aResultadoDeError, aResultadoDeValidacion, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import { cambiarContrasenaPropia } from "@/servicios/personal";

/** Cambiar mi contraseña, también cuando el cambio es obligatorio (FR-019, FR-021). */
export async function cambiarMiContrasenaAccion(
  _estadoPrevio: ResultadoAccion | undefined,
  formData: FormData,
): Promise<ResultadoAccion> {
  const { usuario } = await requerirSesion({ permitirCambioPendiente: true });

  const validacion = esquemaCambioContrasena.safeParse(Object.fromEntries(formData));
  if (!validacion.success) {
    return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);
  }

  try {
    await cambiarContrasenaPropia(usuario.id, validacion.data.contrasenaActual, validacion.data.contrasenaNueva);
  } catch (error) {
    return aResultadoDeError(error);
  }

  // El layout del sistema se dibujó sin menú mientras el cambio estaba pendiente, y Next.js lo reutiliza
  // al navegar a otra página del mismo grupo: sin esto, el menú no aparece hasta refrescar (I-74).
  revalidatePath("/", "layout");
  redirect("/?aviso=contrasena");
}
