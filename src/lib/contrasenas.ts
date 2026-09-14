// Contraseñas con bcrypt (constitución, principio VII; research R-04).
//
// No lleva `server-only` porque también lo usa la semilla (tsx). Nunca se importa desde
// componentes de cliente.
import bcrypt from "bcryptjs";

// Costo 12 en producción (~0,5 s por contraseña). Las pruebas usan 4 para no ser lentas.
function costo(): number {
  return Number(process.env.BCRYPT_COSTO ?? 12);
}

/** Calcula el hash que se guarda en la base. La contraseña original no se puede recuperar. */
export function calcularHashContrasena(contrasena: string): Promise<string> {
  return bcrypt.hash(contrasena, costo());
}

/** Compara una contraseña escrita con el hash guardado. */
export function compararContrasena(contrasena: string, hash: string): Promise<boolean> {
  return bcrypt.compare(contrasena, hash);
}

/**
 * Hash bcrypt de un texto fijo. Cuando alguien intenta ingresar con un usuario que no existe,
 * igual se compara contra este hash: así la respuesta tarda lo mismo que con un usuario real
 * y no se puede averiguar qué cuentas existen midiendo el tiempo (SC-007).
 */
export const HASH_FICTICIO = "$2b$12$1Pon647GlHP//ZzjHE0tuuS8gzvc2wFgLsy38gt.abTNOkE9TRpjK";
