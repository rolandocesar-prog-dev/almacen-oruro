"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { esquemaRepresentante } from "@/esquemas/catalogos/representante";
import { aResultadoDeError, aResultadoDeValidacion, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import {
  desactivarRepresentante,
  modificarRepresentante,
  reactivarRepresentante,
  registrarRepresentante,
} from "@/servicios/catalogos/representantes";

// Orden fijo de toda acción (contracts/acciones-f002.md):
// 1. requerirSesion  2. validar con Zod  3. servicio  4. errores  5. revalidar y redirigir

export async function registrarRepresentanteAccion(_estadoPrevio: ResultadoAccion | undefined, formData: FormData): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaRepresentante.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  let id: number;
  try {
    ({ id } = await registrarRepresentante(validacion.data));
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/representantes");
  revalidatePath("/centros-salud");
  redirect(`/representantes/${id}?aviso=registrado`);
}

export async function modificarRepresentanteAccion(
  id: number,
  _estadoPrevio: ResultadoAccion | undefined,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaRepresentante.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  try {
    await modificarRepresentante(id, validacion.data);
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/representantes");
  revalidatePath(`/representantes/${id}`);
  revalidatePath("/centros-salud");
  redirect(`/representantes/${id}?aviso=modificado`);
}

export async function desactivarRepresentanteAccion(id: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    await desactivarRepresentante(id);
  } catch (error) {
    return aResultadoDeError(error);
  }
  revalidatePath("/representantes");
  revalidatePath(`/representantes/${id}`);
  revalidatePath("/centros-salud");
  return { ok: true, datos: undefined, mensaje: "Representante desactivado. Ya no se puede elegir en pedidos nuevos." };
}

export async function reactivarRepresentanteAccion(id: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    await reactivarRepresentante(id);
  } catch (error) {
    return aResultadoDeError(error);
  }
  revalidatePath("/representantes");
  revalidatePath(`/representantes/${id}`);
  revalidatePath("/centros-salud");
  return { ok: true, datos: undefined, mensaje: "Representante reactivado." };
}
