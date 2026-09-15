/**
 * Monto en bolivianos como se escribe en Bolivia: "Bs 12,50" o "Bs 1.234,50" (research C-08).
 * Recibe el texto con punto decimal que devuelve Prisma.Decimal.toFixed(2), o null si no hay monto.
 */
export function formatearBolivianos(monto: string | null): string {
  if (monto === null) return "—";
  const numero = Number(monto).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Bs ${numero}`;
}

/**
 * Convierte un monto escrito ("12,50", "12.5", "0,05") en centavos enteros (1250, 1250, 5), o null si
 * no es un monto con hasta 2 decimales.
 *
 * La vista previa de una compra suma en centavos enteros para no arrastrar errores de coma flotante
 * (en JavaScript 0.1 + 0.2 no da 0.3). Se arma a partir del texto, sin pasar por un número decimal
 * (F-003, research K-04). El monto que se guarda lo calcula siempre el servidor con Prisma.Decimal.
 */
export function aCentavos(texto: string): number | null {
  const coincidencia = /^(\d{1,10})(?:[.,](\d{1,2}))?$/.exec(texto.trim());
  if (!coincidencia) return null;
  const [, enteros, decimales = ""] = coincidencia;
  return Number(enteros) * 100 + Number(decimales.padEnd(2, "0"));
}

/** Centavos enteros como monto en bolivianos: 123450 → "Bs 1.234,50". */
export function formatearCentavos(centavos: number): string {
  const enteros = Math.floor(centavos / 100).toLocaleString("es-BO");
  const decimales = String(centavos % 100).padStart(2, "0");
  return `Bs ${enteros},${decimales}`;
}
