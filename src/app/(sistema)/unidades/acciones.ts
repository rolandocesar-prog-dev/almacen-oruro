"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { esquemaUnidadMedida } from "@/esquemas/catalogos/unidad-medida";
import { aResultadoDeError, aResultadoDeValidacion, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import {
  desactivarUnidadMedida,
  modificarUnidadMedida,
  reactivarUnidadMedida,
  registrarUnidadMedida,
} from "@/servicios/catalogos/unidades-medida";

// Orden fijo de toda acción (contracts/acciones-f002.md):
// 1. requerirSesion  2. validar con Zod  3. servicio  4. errores  5. revalidar y redirigir

export async function registrarUnidadAccion(_estadoPrevio: ResultadoAccion | undefined, formData: FormData): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaUnidadMedida.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  let id: number;
  try {
    ({ id } = await registrarUnidadMedida(validacion.data));
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/unidades");
  redirect(`/unidades/${id}?aviso=registrado`);
}

export async function modificarUnidadAccion(
  id: number,
  _estadoPrevio: ResultadoAccion | undefined,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaUnidadMedida.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  try {
    await modificarUnidadMedida(id, validacion.data);
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/unidades");
  revalidatePath(`/unidades/${id}`);
  redirect(`/unidades/${id}?aviso=modificado`);
}

export async function desactivarUnidadAccion(id: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    await desactivarUnidadMedida(id);
  } catch (error) {
    return aResultadoDeError(error);
  }
  revalidatePath("/unidades");
  revalidatePath(`/unidades/${id}`);
  return { ok: true, datos: undefined, mensaje: "Unidad de medida desactivada. Ya no se puede elegir para productos nuevos." };
}

export async function reactivarUnidadAccion(id: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    await reactivarUnidadMedida(id);
  } catch (error) {
    return aResultadoDeError(error);
  }
  revalidatePath("/unidades");
  revalidatePath(`/unidades/${id}`);
  return { ok: true, datos: undefined, mensaje: "Unidad de medida reactivada." };
}
