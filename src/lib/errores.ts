// Errores y resultado común de las Server Actions (research R-10).
import type { ZodError } from "zod";

/**
 * Enlace que acompaña a un mensaje de error. Lo usan los duplicados de un registro inactivo:
 * "Ver y reactivar" lleva a su ficha, donde se decide con los datos a la vista (F-002, research C-04).
 */
export type EnlaceDeAviso = { texto: string; ruta: string };

/**
 * Error esperable: el usuario intentó algo que una regla de negocio no permite
 * (un duplicado, desactivarse a sí mismo, etc.). Su mensaje se muestra tal cual.
 */
export class ErrorDeNegocio extends Error {
  readonly campo?: string;
  readonly enlace?: EnlaceDeAviso;

  constructor(mensaje: string, campo?: string, enlace?: EnlaceDeAviso) {
    super(mensaje);
    this.name = "ErrorDeNegocio";
    this.campo = campo;
    this.enlace = enlace;
  }
}

/** Lo que devuelve toda Server Action (contracts/acciones-f001.md). */
export type ResultadoAccion<T = void> =
  | { ok: true; datos: T; mensaje?: string }
  | { ok: false; mensaje: string; errores?: Partial<Record<string, string[]>>; enlace?: EnlaceDeAviso };

const MENSAJE_INESPERADO = "Ocurrió un error inesperado. Intenta nuevamente";

/**
 * Convierte cualquier error en un resultado para mostrar al usuario.
 * Un ErrorDeNegocio conserva su mensaje; cualquier otro error se registra en el servidor
 * y se muestra con un mensaje genérico, para no exponer detalles técnicos.
 */
export function aResultadoDeError(error: unknown): ResultadoAccion<never> {
  if (error instanceof ErrorDeNegocio) {
    return {
      ok: false,
      mensaje: error.message,
      errores: error.campo ? { [error.campo]: [error.message] } : undefined,
      enlace: error.enlace,
    };
  }

  // Solo nombre y mensaje técnico: nunca datos del formulario (pueden contener contraseñas).
  const detalle = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[error inesperado] ${detalle}`);
  return { ok: false, mensaje: MENSAJE_INESPERADO };
}

/**
 * Mensajes de Zod agrupados por ruta completa: "lineas.1.cantidad" para la cantidad de la segunda línea.
 * `z.flattenError` solo agrupa por el primer nivel ("lineas"), y un formulario con líneas necesita
 * saber qué línea y qué campo marcar (F-003, FR-007, research K-03). Para los campos de primer nivel
 * la clave es su nombre, igual que con `z.flattenError`.
 */
export function erroresPorRuta(error: ZodError): Partial<Record<string, string[]>> {
  const errores: Partial<Record<string, string[]>> = {};
  for (const problema of error.issues) {
    const ruta = problema.path.map(String).join(".");
    errores[ruta] = [...(errores[ruta] ?? []), problema.message];
  }
  return errores;
}

/** Resultado de validación fallida con los mensajes por campo de Zod. */
export function aResultadoDeValidacion(
  errores: Partial<Record<string, string[]>>,
): ResultadoAccion<never> {
  return { ok: false, mensaje: "Revisa los datos marcados", errores };
}
