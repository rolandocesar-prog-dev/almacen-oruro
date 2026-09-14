"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { esquemaCentroSalud } from "@/esquemas/catalogos/centro-salud";
import { aResultadoDeError, aResultadoDeValidacion, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import {
  desactivarCentroSalud,
  modificarCentroSalud,
  reactivarCentroSalud,
  registrarCentroSalud,
} from "@/servicios/catalogos/centros-salud";

// Orden fijo de toda acción (contracts/acciones-f002.md):
// 1. requerirSesion  2. validar con Zod  3. servicio  4. errores  5. revalidar y redirigir

export async function registrarCentroSaludAccion(_estadoPrevio: ResultadoAccion | undefined, formData: FormData): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaCentroSalud.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  let id: number;
  try {
    ({ id } = await registrarCentroSalud(validacion.data));
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/centros-salud");
  redirect(`/centros-salud/${id}?aviso=registrado`);
}

export async function modificarCentroSaludAccion(
  id: number,
  _estadoPrevio: ResultadoAccion | undefined,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaCentroSalud.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  try {
    await modificarCentroSalud(id, validacion.data);
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/centros-salud");
  revalidatePath(`/centros-salud/${id}`);
  redirect(`/centros-salud/${id}?aviso=modificado`);
}

export async function desactivarCentroSaludAccion(id: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    await desactivarCentroSalud(id);
  } catch (error) {
    return aResultadoDeError(error);
  }
  revalidatePath("/centros-salud");
  revalidatePath(`/centros-salud/${id}`);
  return { ok: true, datos: undefined, mensaje: "Centro de salud desactivado." };
}

export async function reactivarCentroSaludAccion(id: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    await reactivarCentroSalud(id);
  } catch (error) {
    return aResultadoDeError(error);
  }
  revalidatePath("/centros-salud");
  revalidatePath(`/centros-salud/${id}`);
  return { ok: true, datos: undefined, mensaje: "Centro de salud reactivado." };
}
