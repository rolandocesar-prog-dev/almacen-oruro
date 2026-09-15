"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { esquemaPedido } from "@/esquemas/pedidos";
import { aResultadoDeError, aResultadoDeValidacion, erroresPorRuta, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import { registrarPedido } from "@/servicios/pedidos";

// Orden fijo de toda acción (contracts/acciones-f004.md):
// 1. requerirSesion  2. validar con Zod  3. servicio  4. errores  5. revalidar y redirigir
// Ninguna acción de pedidos toca el stock ni el kardex (FR-003), y no hay acción para borrar un pedido
// ni para elegir su estado (RN-41).

/**
 * Registrar un pedido (Historia 1). Recibe un objeto con la cabecera y las líneas, como el formulario de
 * compra (research P-09), y lo valida con el mismo esquema que usó el formulario.
 */
export async function registrarPedidoAccion(datos: unknown): Promise<ResultadoAccion> {
  const { usuario } = await requerirSesion();

  const validacion = esquemaPedido.safeParse(datos);
  if (!validacion.success) return aResultadoDeValidacion(erroresPorRuta(validacion.error));

  let id: number;
  try {
    ({ id } = await registrarPedido(validacion.data, usuario.id));
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/pedidos");
  redirect(`/pedidos/${id}?aviso=registrado`);
}
