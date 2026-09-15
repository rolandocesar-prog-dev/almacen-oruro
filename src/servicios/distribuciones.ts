// Distribuciones (F-005). Una distribución entrega productos a un representante contra UN pedido y se
// guarda completa —cabecera, líneas, un movimiento de salida por línea y lo entregado del pedido— o no se
// guarda (RN-30). Nunca se edita ni se borra: si tiene errores, se anula con motivo (D-16, principio IV).
//
// Regla de concurrencia en una frase: "primero bloqueo el pedido, después los productos" (research V-01,
// P-03, K-01). Con el pedido bloqueado, dos distribuciones del mismo pedido se ordenan solas y la segunda
// ve el pendiente nuevo; con los productos bloqueados, ven el stock vigente. El stock solo cambia con
// registrarMovimiento() y el estado del pedido solo con recalcularEstadoPedido().
import { prisma } from "@/lib/prisma";

/**
 * Por defecto Prisma espera 2 s por una conexión y corta la transacción a los 5 s. Con varias
 * distribuciones esperando el bloqueo del mismo pedido o producto, esos límites se alcanzarían sin que
 * haya un error real (research K-12).
 */
const OPCIONES_TRANSACCION = { maxWait: 10_000, timeout: 10_000 };

/** Las distribuciones crecen sin límite (36 meses simulados): el listado se pagina, como las compras. */
export const DISTRIBUCIONES_POR_PAGINA = 50;

export type SituacionDeLinea = "completa" | "sin-stock" | "entregable";

/**
 * Qué se puede entregar de una línea del pedido (RN-36, FR-002; data-model §2).
 * El máximo es el menor entre lo pendiente y el stock (RN-32): no se entrega más de lo pedido ni más de lo
 * que hay. Una línea completa o sin stock no admite cantidad.
 */
export function situacionDeLinea(pendiente: number, stock: number): { situacion: SituacionDeLinea; maximoEntregable: number } {
  if (pendiente === 0) return { situacion: "completa", maximoEntregable: 0 };
  if (stock === 0) return { situacion: "sin-stock", maximoEntregable: 0 };
  return { situacion: "entregable", maximoEntregable: Math.min(pendiente, stock) };
}

/** Distribución REGISTRADA con ese Nº de vale, si existe. Un vale de una distribución ANULADA queda libre (RN-31). */
export function buscarValeVigente(nroVale: string) {
  return prisma.distribucion.findFirst({ where: { nroVale, estado: "REGISTRADA" }, select: { id: true } });
}
