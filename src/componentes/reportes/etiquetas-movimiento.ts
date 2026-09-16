import type { TipoMovimiento } from "@/generado/prisma/client";

/** Nombre en español de cada tipo de movimiento del kardex; lo comparten la consulta de F-003 y R-4. */
export const NOMBRE_DEL_TIPO: Record<TipoMovimiento, string> = {
  ENTRADA_COMPRA: "Entrada por compra",
  ANULACION_COMPRA: "Anulación de compra",
  SALIDA_DISTRIBUCION: "Salida por distribución",
  ANULACION_DISTRIBUCION: "Anulación de distribución",
};
