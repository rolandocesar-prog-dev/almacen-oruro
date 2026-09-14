"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { esquemaCambioPrecio, esquemaProveedorProducto } from "@/esquemas/catalogos/proveedor-producto";
import { aResultadoDeError, aResultadoDeValidacion, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import {
  asociarProducto,
  cambiarPrecioReferencial,
  desactivarAsociacion,
  reactivarAsociacion,
} from "@/servicios/catalogos/proveedor-producto";

// Acciones de la sección "Productos que ofrece" de la ficha del proveedor (Historia 6).
// Orden fijo: 1. requerirSesion  2. validar con Zod  3. servicio  4. errores  5. revalidar

/** La ficha del proveedor y la del producto muestran la asociación: se actualizan las dos (FR-026). */
function revalidarFichas({ proveedorId, productoId }: { proveedorId: number; productoId: number }) {
  revalidatePath(`/proveedores/${proveedorId}`);
  revalidatePath(`/productos/${productoId}`);
}

export async function asociarProductoAccion(
  proveedorId: number,
  _estadoPrevio: ResultadoAccion | undefined,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaProveedorProducto.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  try {
    revalidarFichas(await asociarProducto(proveedorId, validacion.data));
  } catch (error) {
    return aResultadoDeError(error);
  }
  return { ok: true, datos: undefined, mensaje: "Producto agregado a la lista del proveedor." };
}

export async function cambiarPrecioReferencialAccion(
  asociacionId: number,
  _estadoPrevio: ResultadoAccion | undefined,
  formData: FormData,
): Promise<ResultadoAccion> {
  await requerirSesion();

  const validacion = esquemaCambioPrecio.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  try {
    revalidarFichas(await cambiarPrecioReferencial(asociacionId, validacion.data.precioReferencial));
  } catch (error) {
    return aResultadoDeError(error);
  }
  return { ok: true, datos: undefined, mensaje: "Precio actualizado." };
}

export async function desactivarAsociacionAccion(asociacionId: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    revalidarFichas(await desactivarAsociacion(asociacionId));
  } catch (error) {
    return aResultadoDeError(error);
  }
  return { ok: true, datos: undefined, mensaje: "Producto quitado de la lista." };
}

export async function reactivarAsociacionAccion(asociacionId: number): Promise<ResultadoAccion> {
  await requerirSesion();
  try {
    revalidarFichas(await reactivarAsociacion(asociacionId));
  } catch (error) {
    return aResultadoDeError(error);
  }
  return { ok: true, datos: undefined, mensaje: "Producto reactivado en la lista." };
}
