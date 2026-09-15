"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { esquemaDistribucion, esquemaVerificacionVale } from "@/esquemas/distribuciones";
import { aResultadoDeError, aResultadoDeValidacion, erroresPorRuta, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import { buscarValeVigente, registrarDistribucion } from "@/servicios/distribuciones";

// Orden fijo de toda acción (contracts/acciones-f005.md):
// 1. requerirSesion  2. validar con Zod  3. servicio  4. errores  5. revalidar y redirigir
// No existe acción para editar ni borrar una distribución (FR-012, D-16).

/** Una distribución cambia stock, kardex y pedido: se revalidan todas las páginas que los muestran. */
function revalidarAfectadas(distribucionId: number, pedidoId: number, productoIds: number[]) {
  revalidatePath("/distribuciones");
  revalidatePath(`/distribuciones/${distribucionId}`);
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/existencias");
  for (const productoId of productoIds) revalidatePath(`/kardex/${productoId}`);
}

/**
 * Registrar una distribución (Historia 1). Recibe un objeto con la cabecera y una entrada por línea del
 * pedido (research V-02) y lo valida con el mismo esquema que usó el formulario.
 */
export async function registrarDistribucionAccion(datos: unknown): Promise<ResultadoAccion> {
  const { usuario } = await requerirSesion();

  const validacion = esquemaDistribucion.safeParse(datos);
  if (!validacion.success) return aResultadoDeValidacion(erroresPorRuta(validacion.error));

  let resultado: Awaited<ReturnType<typeof registrarDistribucion>>;
  try {
    resultado = await registrarDistribucion(validacion.data, usuario.id);
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidarAfectadas(resultado.id, resultado.pedidoId, resultado.productoIds);
  redirect(`/distribuciones/${resultado.id}?aviso=registrada`);
}

/**
 * ¿El vale ya está en una distribución vigente? La usa el formulario al salir del campo para avisar antes
 * de cargar cantidades (RN-31). Es solo una ayuda: con datos inválidos responde "no duplicado" y la
 * verificación que decide ocurre al guardar.
 */
export async function verificarValeAccion(nroVale: string): Promise<ResultadoAccion<{ duplicado: boolean; distribucionId?: number }>> {
  await requerirSesion();

  const validacion = esquemaVerificacionVale.safeParse({ nroVale });
  if (!validacion.success) return { ok: true, datos: { duplicado: false } };

  const vigente = await buscarValeVigente(validacion.data.nroVale);
  return { ok: true, datos: vigente ? { duplicado: true, distribucionId: vigente.id } : { duplicado: false } };
}
