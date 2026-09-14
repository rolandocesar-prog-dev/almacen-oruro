// Token de sesión y su hash (research R-03).
//
// Funciones puras, sin Next.js: las usan los servicios y se pueden probar con Vitest.

import { createHash, randomBytes } from "node:crypto";

/** Una sesión vale 8 horas desde el ingreso, sin importar la actividad (RN-03, aclaración 4). */
export const DURACION_SESION_HORAS = 8;

/** Genera un token aleatorio de 32 bytes: imposible de adivinar. Va en la cookie del navegador. */
export function generarToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash SHA-256 del token, en hexadecimal (64 caracteres). En la base se guarda solo este hash:
 * aunque alguien lea la tabla `sesion`, no obtiene tokens válidos para usar sesiones ajenas.
 */
export function calcularHashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
