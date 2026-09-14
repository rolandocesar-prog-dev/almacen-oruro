/**
 * Id numérico de una ruta como /categorias/7. Devuelve null si no es un entero positivo,
 * para que la página responda "no encontrado" en lugar de fallar con /categorias/abc.
 */
export function idDeRuta(valor: string): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}
