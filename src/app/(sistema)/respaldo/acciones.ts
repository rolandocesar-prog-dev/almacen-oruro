"use server";

import { aResultadoDeError, type ResultadoAccion } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import { generarRespaldo } from "@/servicios/respaldo";

// Orden fijo de toda acción (contracts/acciones-f001.md): 1. requerirSesion  2. servicio  3. errores.
// No hay datos que validar ni nada que revalidar: el respaldo no cambia la base.

/**
 * Genera el respaldo y devuelve el archivo para que el navegador lo descargue (research O-09). Se usa una
 * Server Action, como en el resto del sistema, y no un manejador de ruta: el patrón es el mismo de siempre.
 */
export async function generarRespaldoAccion(): Promise<ResultadoAccion<{ nombreArchivo: string; contenido: string }>> {
  await requerirSesion();
  try {
    return { ok: true, datos: await generarRespaldo() };
  } catch (error) {
    return aResultadoDeError(error);
  }
}
