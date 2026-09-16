// Números del módulo de IA para mostrar en pantalla y en papel, como se escriben en Bolivia (F-007).

/** Cantidad con un decimal: 10.7 → "10,7"; 1234 → "1.234,0". Es como se muestra el pronóstico (FR-003). */
export function formatearUnDecimal(valor: number): string {
  return valor.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Porcentaje con un decimal a partir de una proporción: 0.1234 → "12,3 %". Sin valor, "No aplica". */
export function formatearPorcentaje(proporcion: number | null): string {
  if (proporcion === null) return "No aplica";
  return `${formatearUnDecimal(proporcion * 100)} %`;
}
