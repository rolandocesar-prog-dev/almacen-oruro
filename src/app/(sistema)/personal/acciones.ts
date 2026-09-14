"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { esquemaRegistroPersonal } from "@/esquemas/personal";
import { aResultadoDeError, aResultadoDeValidacion, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import { registrarPersonal } from "@/servicios/personal";

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
