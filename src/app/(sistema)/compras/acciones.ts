"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { esquemaAnulacion, esquemaCompra, esquemaVerificacionFactura } from "@/esquemas/compras";
import { aResultadoDeError, aResultadoDeValidacion, erroresPorRuta, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import { anularCompra, buscarFacturaVigente, registrarCompra } from "@/servicios/compras";

// Orden fijo de toda acción (contracts/acciones-f003.md):
// 1. requerirSesion  2. validar con Zod  3. servicio  4. errores  5. revalidar y redirigir

/**
 * Registrar una compra (Historia 1). Recibe un objeto con la cabecera y las líneas, no un FormData:
 * una lista de líneas no cabe bien en campos planos (research K-03). Se valida con el mismo esquema
 * que usó el formulario.
 */
export async function registrarCompraAccion(datos: unknown): Promise<ResultadoAccion> {
  const { usuario } = await requerirSesion();

  const validacion = esquemaCompra.safeParse(datos);
  if (!validacion.success) return aResultadoDeValidacion(erroresPorRuta(validacion.error));

  let id: number;
  try {
    ({ id } = await registrarCompra(validacion.data, usuario.id));
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/compras");
  revalidatePath("/existencias");
  redirect(`/compras/${id}?aviso=registrada`);
}

/**
 * Anular una compra con motivo (Historia 5). El id se fija con .bind() en la ficha.
 * Revalida también las existencias y el kardex de cada producto, porque su stock cambió.
 */
export async function anularCompraAccion(
  compraId: number,
  _estadoPrevio: ResultadoAccion | undefined,
  formData: FormData,
): Promise<ResultadoAccion> {
  const { usuario } = await requerirSesion();

  const validacion = esquemaAnulacion.safeParse(Object.fromEntries(formData));
  if (!validacion.success) return aResultadoDeValidacion(z.flattenError(validacion.error).fieldErrors);

  let productoIds: number[];
  try {
    ({ productoIds } = await anularCompra(compraId, validacion.data.motivo, usuario.id));
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/compras");
  revalidatePath(`/compras/${compraId}`);
  revalidatePath("/existencias");
  for (const productoId of productoIds) revalidatePath(`/kardex/${productoId}`);
  return { ok: true, datos: undefined, mensaje: "Compra anulada. El stock de sus productos se revirtió." };
}

/**
 * ¿Ya hay una compra vigente con esa factura para ese proveedor? La usa el formulario al salir del
 * campo para avisar antes de cargar productos (RN-21). Es solo una ayuda: con datos incompletos
 * responde "no duplicada" y la verificación que decide ocurre al guardar.
 */
export async function verificarFacturaAccion(
  proveedorId: number,
  nroFactura: string,
): Promise<ResultadoAccion<{ duplicada: boolean; compraId?: number }>> {
  await requerirSesion();

  const validacion = esquemaVerificacionFactura.safeParse({ proveedorId, nroFactura });
  if (!validacion.success) return { ok: true, datos: { duplicada: false } };

  const vigente = await buscarFacturaVigente(validacion.data.proveedorId, validacion.data.nroFactura);
  return { ok: true, datos: vigente ? { duplicada: true, compraId: vigente.id } : { duplicada: false } };
}
