"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { esquemaProveedor } from "@/esquemas/catalogos/proveedor";
import { aResultadoDeError, aResultadoDeValidacion, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import { desactivarProveedor, modificarProveedor, reactivarProveedor, registrarProveedor } from "@/servicios/catalogos/proveedores";

// Orden fijo de toda acción (contracts/acciones-f002.md):
// 1. requerirSesion  2. validar con Zod  3. servicio  4. errores  5. revalidar y redirigir

export async function registrarProveedorAccion(_estadoPrevio: ResultadoAccion | undefined, formData: FormData): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaProveedor.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  let id: number;
  try {
    ({ id } = await registrarProveedor(validacion.data));
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/proveedores");
  redirect(`/proveedores/${id}?aviso=registrado`);
}

export async function modificarProveedorAccion(
  id: number,
  _estadoPrevio: ResultadoAccion | undefined,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaProveedor.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  try {
    await modificarProveedor(id, validacion.data);
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/proveedores");
  revalidatePath(`/proveedores/${id}`);
  redirect(`/proveedores/${id}?aviso=modificado`);
}

export async function desactivarProveedorAccion(id: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    await desactivarProveedor(id);
  } catch (error) {
    return aResultadoDeError(error);
  }
  revalidatePath("/proveedores");
  revalidatePath(`/proveedores/${id}`);
  return { ok: true, datos: undefined, mensaje: "Proveedor desactivado. Sus compras anteriores lo siguen mostrando." };
}

export async function reactivarProveedorAccion(id: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    await reactivarProveedor(id);
  } catch (error) {
    return aResultadoDeError(error);
  }
  revalidatePath("/proveedores");
  revalidatePath(`/proveedores/${id}`);
  return { ok: true, datos: undefined, mensaje: "Proveedor reactivado." };
}
