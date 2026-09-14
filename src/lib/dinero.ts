/**
 * Monto en bolivianos como se escribe en Bolivia: "Bs 12,50" o "Bs 1.234,50" (research C-08).
 * Recibe el texto con punto decimal que devuelve Prisma.Decimal.toFixed(2), o null si no hay monto.
 */
export function formatearBolivianos(monto: string | null): string {
  if (monto === null) return "—";
  const numero = Number(monto).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Bs ${numero}`;
}
