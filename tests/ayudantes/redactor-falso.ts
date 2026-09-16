// Redactores falsos para probar los Informes IA sin red ni clave (F-007, research A-08, A-14).
import type { SeccionesInforme } from "@/esquemas/ia";
import { ErrorDeRedaccion, type MotivoDeFalla, type PeticionDeRedaccion, type Redactor } from "@/servicios/ia/redactor";

export const SECCIONES_DE_PRUEBA: SeccionesInforme = {
  resumen: "En el período se registró actividad normal.",
  hallazgos: ["El gasto subió respecto del período anterior."],
  alertas: [],
  recomendaciones: ["Reponer los productos bajo mínimo."],
};

/** Redactor que responde bien y anota cada petición que recibe. */
export function redactorQueResponde(secciones: unknown = SECCIONES_DE_PRUEBA) {
  const peticiones: PeticionDeRedaccion[] = [];
  const redactor: Redactor = async (peticion) => {
    peticiones.push(peticion);
    return secciones as SeccionesInforme;
  };
  return { redactor, peticiones };
}

/** Redactor que falla con el motivo indicado, como lo haría el real. */
export function redactorQueFalla(motivo: MotivoDeFalla): Redactor {
  return async () => {
    throw new ErrorDeRedaccion(motivo);
  };
}

/** Todas las claves de un objeto, a cualquier profundidad. */
export function clavesEnProfundidad(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.flatMap(clavesEnProfundidad);
  if (valor && typeof valor === "object") {
    return Object.entries(valor).flatMap(([clave, hijo]) => [clave, ...clavesEnProfundidad(hijo)]);
  }
  return [];
}

/** Claves que nunca pueden viajar al modelo (FR-012, research A-10). */
export const CLAVES_PROHIBIDAS = /^(telefono|direccion|correo|email|ci|contrasena|contrasenaHash)$/i;
