"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { esquemaNuevoInforme } from "@/esquemas/ia";
import { aResultadoDeError, aResultadoDeValidacion, erroresPorRuta, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import { generarInforme } from "@/servicios/ia/informes";

// Única acción de F-007 (contracts/acciones-f007.md §2). Orden fijo de toda acción:
// 1. requerirSesion  2. validar con Zod  3. servicio  4. errores  5. revalidar y redirigir
// No existe acción para editar ni borrar un informe (FR-014).

/** Generar un Informe IA (Historias 4 y 5). Si falla, no se guardó nada y el mensaje lo dice (FR-015). */
export async function generarInformeAccion(datos: unknown): Promise<ResultadoAccion> {
  const { usuario } = await requerirSesion();

  const validacion = esquemaNuevoInforme.safeParse(datos);
  if (!validacion.success) return aResultadoDeValidacion(erroresPorRuta(validacion.error));

  let resultado: Awaited<ReturnType<typeof generarInforme>>;
  try {
    const { tipo, desde, hasta } = validacion.data;
    resultado = await generarInforme(tipo, { desde, hasta }, usuario.id);
  } catch (error) {
    return aResultadoDeError(error);
  }

  revalidatePath("/ia/informes");
  redirect(`/ia/informes/${resultado.id}?aviso=generado`);
}
