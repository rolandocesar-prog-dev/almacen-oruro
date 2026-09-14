// Normalización de textos (RN-10, research R-06).

/**
 * Deja el texto listo para comparar valores únicos: sin espacios en los extremos, con un solo
 * espacio entre palabras y en minúsculas. Las tildes se conservan: "Lavandina" y "lavandina"
 * son iguales, pero "Pérez" y "Perez" no.
 *
 * Así " lavandina  1 l " y "Lavandina 1 L" se reconocen como el mismo nombre.
 */
export function normalizarTexto(valor: string): string {
  return recortarEspacios(valor).toLowerCase();
}

/**
 * Quita espacios de los extremos y reduce los espacios internos a uno,
 * respetando las mayúsculas que escribió el usuario. Es lo que se guarda para mostrar.
 */
export function recortarEspacios(valor: string): string {
  return valor.trim().replace(/\s+/g, " ");
}
