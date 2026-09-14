"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { esquemaCategoria } from "@/esquemas/catalogos/categoria";
import { aResultadoDeError, aResultadoDeValidacion, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import { desactivarCategoria, modificarCategoria, reactivarCategoria, registrarCategoria } from "@/servicios/catalogos/categorias";

// Orden fijo de toda acción (contracts/acciones-f002.md):
// 1. requerirSesion  2. validar con Zod  3. servicio  4. errores  5. revalidar y redirigir

export async function registrarCategoriaAccion(_estadoPrevio: ResultadoAccion | undefined, formData: FormData): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaCategoria.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  let id: number;
  try {
    ({ id } = await registrarCategoria(validacion.data));
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/categorias");
  redirect(`/categorias/${id}?aviso=registrado`);
}

export async function modificarCategoriaAccion(
  id: number,
  _estadoPrevio: ResultadoAccion | undefined,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaCategoria.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  try {
    await modificarCategoria(id, validacion.data);
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/categorias");
  revalidatePath(`/categorias/${id}`);
  redirect(`/categorias/${id}?aviso=modificado`);
}

export async function desactivarCategoriaAccion(id: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    await desactivarCategoria(id);
  } catch (error) {
    return aResultadoDeError(error);
  }
  revalidatePath("/categorias");
  revalidatePath(`/categorias/${id}`);
  return { ok: true, datos: undefined, mensaje: "Categoría desactivada. Ya no se puede elegir para productos nuevos." };
}

export async function reactivarCategoriaAccion(id: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    await reactivarCategoria(id);
  } catch (error) {
    return aResultadoDeError(error);
  }
  revalidatePath("/categorias");
  revalidatePath(`/categorias/${id}`);
  return { ok: true, datos: undefined, mensaje: "Categoría reactivada." };
}
