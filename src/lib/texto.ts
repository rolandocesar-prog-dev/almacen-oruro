// Normalización de textos (RN-10, research R-06) y búsqueda en listados (F-002, research C-01).

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

/**
 * Texto preparado solo para BUSCAR: como normalizarTexto, pero además sin tildes.
 * Al buscar, quien escribe "lavandína" o "LAVANDINA" espera encontrar "Lavandina" (FR-007).
 * No se usa para la unicidad: ahí "Pérez" y "Perez" siguen siendo distintos.
 *
 * normalize("NFD") separa cada letra de su tilde ("í" → "i" + marca) y la expresión quita las marcas.
 */
export function paraBuscar(valor: string): string {
  return normalizarTexto(valor).normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * ¿Alguno de los campos contiene el texto buscado? Sin mayúsculas ni tildes.
 * Un texto vacío coincide con todo (no se está buscando nada) y un campo sin dato no coincide.
 *
 * Se filtra en memoria después de la consulta porque los catálogos tienen decenas de registros
 * (research C-01); si crecieran a miles, convendría la extensión unaccent de PostgreSQL.
 */
export function coincideBusqueda(texto: string | undefined, ...campos: (string | null | undefined)[]): boolean {
  const buscado = paraBuscar(texto ?? "");
  if (!buscado) return true;
  return campos.some((campo) => campo != null && paraBuscar(campo).includes(buscado));
}

/**
 * Orden alfabético en español para Array.sort: "Álvarez" va con la A y no después de la Z,
 * y las mayúsculas no alteran el orden (FR-007).
 */
export function compararEnEspanol(a: string, b: string): number {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}
