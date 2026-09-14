// Errores y resultado común de las Server Actions (research R-10).

/**
 * Error esperable: el usuario intentó algo que una regla de negocio no permite
 * (un duplicado, desactivarse a sí mismo, etc.). Su mensaje se muestra tal cual.
 */
export class ErrorDeNegocio extends Error {
  readonly campo?: string;

  constructor(mensaje: string, campo?: string) {
    super(mensaje);
    this.name = "ErrorDeNegocio";
    this.campo = campo;
  }
}

/** Lo que devuelve toda Server Action (contracts/acciones-f001.md). */
export type ResultadoAccion<T = void> =
  | { ok: true; datos: T; mensaje?: string }
  | { ok: false; mensaje: string; errores?: Partial<Record<string, string[]>> };

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
    };
  }

  // Solo nombre y mensaje técnico: nunca datos del formulario (pueden contener contraseñas).
  const detalle = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[error inesperado] ${detalle}`);
  return { ok: false, mensaje: MENSAJE_INESPERADO };
}

/** Resultado de validación fallida con los mensajes por campo de Zod. */
export function aResultadoDeValidacion(
  errores: Partial<Record<string, string[]>>,
): ResultadoAccion<never> {
  return { ok: false, mensaje: "Revisa los datos marcados", errores };
}
