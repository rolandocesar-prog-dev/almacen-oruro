"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { esquemaDatosPersonales, esquemaRegistroPersonal, esquemaRestablecimiento } from "@/esquemas/personal";
import { aResultadoDeError, aResultadoDeValidacion, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import {
  desactivarPersonal,
  modificarPersonal,
  reactivarPersonal,
  registrarPersonal,
  restablecerContrasena,
} from "@/servicios/personal";

// Todas las acciones siguen el mismo orden (contracts/acciones-f001.md):
// 1. requerirSesion  2. validar con Zod  3. servicio  4. errores  5. revalidar y redirigir

/** Registrar personal (Historia 3). */
export async function registrarPersonalAccion(
  _estadoPrevio: ResultadoAccion | undefined,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaRegistroPersonal.safeParse(Object.fromEntries(formData));
  if (!validacion.success) {
    return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);
  }

  let id: number;
  try {
    ({ id } = await registrarPersonal(validacion.data));
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/personal");
  redirect(`/personal/${id}?aviso=registrado`);
}

/** Modificar datos de una persona (Historia 4). El id se fija con .bind() en la página. */
export async function modificarPersonalAccion(
  id: number,
  _estadoPrevio: ResultadoAccion | undefined,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaDatosPersonales.safeParse(Object.fromEntries(formData));
  if (!validacion.success) {
    return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);
  }

  try {
    await modificarPersonal(id, validacion.data);
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/personal");
  revalidatePath(`/personal/${id}`);
  redirect(`/personal/${id}?aviso=modificado`);
}

/** Desactivar a una persona (Historia 4). */
export async function desactivarPersonalAccion(id: number): Promise<ResultadoAccion> {
  const { usuario } = await requerirSesion();
  try {
    await desactivarPersonal(id, usuario.id);
  } catch (error) {
    return aResultadoDeError(error);
  }
  revalidatePath("/personal");
  revalidatePath(`/personal/${id}`);
  return { ok: true, datos: undefined, mensaje: "Persona desactivada. Ya no puede ingresar y se cerraron sus sesiones abiertas." };
}

/** Restablecer la contraseña de otra persona con una temporal (Historia 5). */
export async function restablecerContrasenaAccion(
  id: number,
  _estadoPrevio: ResultadoAccion | undefined,
  formData: FormData,
): Promise<ResultadoAccion> {
  const { usuario } = await requerirSesion();

  const validacion = esquemaRestablecimiento.safeParse(Object.fromEntries(formData));
  if (!validacion.success) {
    return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);
  }

  try {
    await restablecerContrasena(id, validacion.data.contrasenaTemporal, usuario.id);
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath(`/personal/${id}`);
  return {
    ok: true,
    datos: undefined,
    mensaje: "Contraseña restablecida. Se cerraron sus sesiones abiertas y deberá cambiarla al ingresar.",
  };
}

/** Reactivar a una persona (Historia 4). */
export async function reactivarPersonalAccion(id: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    await reactivarPersonal(id);
  } catch (error) {
    return aResultadoDeError(error);
  }
  revalidatePath("/personal");
  revalidatePath(`/personal/${id}`);
  return { ok: true, datos: undefined, mensaje: "Persona reactivada. Puede volver a ingresar con su contraseña." };
}
