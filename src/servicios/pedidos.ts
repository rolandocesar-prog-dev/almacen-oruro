// Pedidos (F-004). El pedido registra lo que un representante necesita; NO mueve stock (FR-003): el stock
// sale al distribuir (F-005). Su estado no se elige: se calcula a partir de lo entregado de cada línea,
// salvo la anulación con motivo (RN-41, RN-43).
//
// Regla de concurrencia en una frase: "bloqueo el pedido y veo su estado" (research P-03). Editar,
// anular y distribuir (F-005) empiezan bloqueando la fila del pedido; quien llega segundo espera y, al
// continuar, ve el estado que dejó el primero. En todo el sistema se bloquea primero el pedido y después
// los productos, así una distribución y una compra nunca se esperan en círculo.
import type { EstadoPedido, Prisma } from "@/generado/prisma/client";

type Transaccion = Prisma.TransactionClient;

/** Estado que puede calcularse a partir de las líneas: ANULADO nunca sale de un cálculo. */
export type EstadoCalculado = Exclude<EstadoPedido, "ANULADO">;

/**
 * Por defecto Prisma espera 2 s por una conexión y corta la transacción a los 5 s. Una edición que espera
 * el bloqueo del pedido mientras se guarda una distribución alcanzaría esos límites sin error real
 * (research K-12).
 */
const OPCIONES_TRANSACCION = { maxWait: 10_000, timeout: 10_000 };

/** Los pedidos crecen con el tiempo (36 meses simulados): el listado se pagina, como las compras. */
export const PEDIDOS_POR_PAGINA = 50;

/**
 * RN-41: el estado del pedido sale de sus líneas, con la tabla de la especificación.
 *
 * | Si…                                          | Estado    |
 * |----------------------------------------------|-----------|
 * | ninguna línea tiene entregas                 | PENDIENTE |
 * | en todas, lo entregado = lo solicitado       | ATENDIDO  |
 * | en otro caso                                 | PARCIAL   |
 *
 * Nunca devuelve ANULADO: ese estado solo lo pone la anulación (RN-43).
 */
export function calcularEstadoPedido(lineas: { cantidadSolicitada: number; cantidadEntregada: number }[]): EstadoCalculado {
  if (lineas.every((linea) => linea.cantidadEntregada === 0)) return "PENDIENTE";
  if (lineas.every((linea) => linea.cantidadEntregada === linea.cantidadSolicitada)) return "ATENDIDO";
  return "PARCIAL";
}

/**
 * Bloquea la fila del pedido hasta que termine la transacción y devuelve su estado, o null si no existe.
 * Es la PRIMERA operación de editar, anular y de las distribuciones de F-005: el orden de bloqueo del
 * sistema es "primero el pedido, después los productos" (research P-03). Prisma no ofrece
 * SELECT … FOR UPDATE; la consulta va parametrizada con $queryRaw (principio VII).
 */
export async function bloquearPedido(tx: Transaccion, pedidoId: number): Promise<{ estado: EstadoPedido } | null> {
  // estado::text: el tipo enumerado de PostgreSQL llega como texto sin depender del adaptador.
  const filas = await tx.$queryRaw<{ id: number; estado: EstadoPedido }[]>`
    SELECT id, estado::text AS estado
    FROM pedido
    WHERE id = ${pedidoId}
    FOR UPDATE`;
  const fila = filas[0];
  return fila ? { estado: fila.estado } : null;
}

/**
 * Vuelve a calcular y guarda el estado del pedido después de cambiar lo entregado (FR-008). La llaman
 * las distribuciones de F-005 dentro de su transacción, con el pedido ya bloqueado.
 * Un pedido ANULADO sigue ANULADO aunque se anule una de sus distribuciones (RN-35): la anulación es
 * una decisión del encargado, no un resultado de las cantidades.
 */
export async function recalcularEstadoPedido(tx: Transaccion, pedidoId: number): Promise<EstadoPedido> {
  const pedido = await tx.pedido.findUniqueOrThrow({
    where: { id: pedidoId },
    select: { estado: true, lineas: { select: { cantidadSolicitada: true, cantidadEntregada: true } } },
  });
  if (pedido.estado === "ANULADO") return "ANULADO";

  const estado = calcularEstadoPedido(pedido.lineas);
  if (estado !== pedido.estado) await tx.pedido.update({ where: { id: pedidoId }, data: { estado } });
  return estado;
}
