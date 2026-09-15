// Configuración del sistema: una sola fila (id 1) con la marca de datos simulados (F-006, research E-07).
//
// F-006 solo LEE la marca; quien la escribe es el generador de datos simulados de F-007. Cuando está
// encendida, las pantallas y los reportes muestran "Datos simulados con fines de demostración" (D-07,
// principio VIII): el tribunal ve de inmediato que los datos no son reales.
import { prisma } from "@/lib/prisma";

export type Configuracion = { modoDemostracion: boolean; datosSimuladosEn: Date | null };

/** Marca de demostración de la base. Si la fila no existe todavía, la base no es de demostración. */
export async function obtenerConfiguracion(): Promise<Configuracion> {
  const configuracion = await prisma.configuracion.findUnique({
    where: { id: 1 },
    select: { modoDemostracion: true, datosSimuladosEn: true },
  });
  return configuracion ?? { modoDemostracion: false, datosSimuladosEn: null };
}
