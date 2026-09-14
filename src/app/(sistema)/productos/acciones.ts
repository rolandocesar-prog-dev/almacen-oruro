"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { esquemaProducto } from "@/esquemas/catalogos/producto";
import { aResultadoDeError, aResultadoDeValidacion, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import { desactivarProducto, modificarProducto, reactivarProducto, registrarProducto } from "@/servicios/catalogos/productos";

// Orden fijo de toda acción (contracts/acciones-f002.md):
// 1. requerirSesion  2. validar con Zod  3. servicio  4. errores  5. revalidar y redirigir

export async function registrarProductoAccion(_estadoPrevio: ResultadoAccion | undefined, formData: FormData): Promise<ResultadoAccion> {
  await requerirSesion();

  // esquemaProducto no tiene stockActual: si alguien lo envía, se descarta aquí (RN-15).
  const validacion = esquemaProducto.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  let id: number;
  try {
    ({ id } = await registrarProducto(validacion.data));
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/productos");
  redirect(`/productos/${id}?aviso=registrado`);
}

export async function modificarProductoAccion(
  id: number,
  _estadoPrevio: ResultadoAccion | undefined,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaProducto.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  try {
    await modificarProducto(id, validacion.data);
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/productos");
  revalidatePath(`/productos/${id}`);
  redirect(`/productos/${id}?aviso=modificado`);
}

export async function desactivarProductoAccion(id: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    await desactivarProducto(id);
  } catch (error) {
    return aResultadoDeError(error);
  }
  revalidatePath("/productos");
  revalidatePath(`/productos/${id}`);
  return { ok: true, datos: undefined, mensaje: "Producto desactivado. Ya no se puede elegir en compras ni pedidos nuevos." };
}

export async function reactivarProductoAccion(id: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    await reactivarProducto(id);
  } catch (error) {
    return aResultadoDeError(error);
  }
  revalidatePath("/productos");
  revalidatePath(`/productos/${id}`);
  return { ok: true, datos: undefined, mensaje: "Producto reactivado." };
}
