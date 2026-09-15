// Inventario: la única puerta del stock (F-003; también la usa F-005). Constitución, principio III.
//
// El stock de un producto solo cambia con registrarMovimiento(), siempre dentro de la transacción del
// documento que lo origina (compra, distribución o sus anulaciones). La regla en una frase:
// "bloqueo la fila del producto, leo su stock, verifico que no quede negativo y escribo el movimiento y
// el stock juntos" (research K-01).
//
// - Mientras la fila está bloqueada, ninguna otra transacción puede leer ese stock para cambiarlo: el
//   saldo de cada movimiento es el anterior más su cantidad (RN-51) y el orden de id es el de registro.
// - Con varios productos se bloquean en orden de id: dos documentos con los mismos productos los
//   bloquean siempre en el mismo orden y no se quedan esperando uno al otro.
// - Se bloquea ANTES de insertar filas que referencien al producto (líneas, movimientos): insertarlas
//   toma un bloqueo FOR KEY SHARE sobre el producto que choca con FOR UPDATE.
import { Prisma, type TipoMovimiento } from "@/generado/prisma/client";
import type { FiltroExistencias } from "@/esquemas/inventario";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { coincideBusqueda, compararEnEspanol } from "@/lib/texto";
import { estaBajoMinimo } from "./catalogos/productos";

type Transaccion = Prisma.TransactionClient;

export type ProductoBloqueado = { codigo: string; nombre: string; stockActual: number };

/**
 * Bloquea las filas de los productos hasta que termine la transacción y devuelve su stock.
 * Prisma no ofrece SELECT … FOR UPDATE, por eso es la única consulta SQL escrita a mano; va
 * parametrizada con $queryRaw, así que los ids nunca se pegan como texto (principio VII).
 */
export async function bloquearProductos(tx: Transaccion, productoIds: number[]): Promise<Map<number, ProductoBloqueado>> {
  const ids = [...new Set(productoIds)].sort((a, b) => a - b);
  const filas = await tx.$queryRaw<{ id: number; codigo: string; nombre: string; stock_actual: number }[]>`
    SELECT id, codigo, nombre, stock_actual
    FROM producto
    WHERE id IN (${Prisma.join(ids)})
    ORDER BY id
    FOR UPDATE`;

  if (filas.length !== ids.length) throw new ErrorDeNegocio("No existe el producto indicado");
  return new Map(filas.map((fila) => [fila.id, { codigo: fila.codigo, nombre: fila.nombre, stockActual: fila.stock_actual }]));
}

export type DatosMovimiento = {
  productoId: number;
  tipo: TipoMovimiento;
  /** Con signo: positiva entra, negativa sale. */
  cantidad: number;
  /** Fecha del documento; en las anulaciones, la del documento anulado (RN-53). */
  fechaDocumento: Date;
  compraId?: number;
  distribucionId?: number;
  usuarioId: number;
};

/**
 * Registra un movimiento de kardex y actualiza el stock del producto en la misma transacción.
 * Es la ÚNICA función del sistema que escribe `stockActual` (principio III, FR-015).
 */
export async function registrarMovimiento(tx: Transaccion, movimiento: DatosMovimiento): Promise<{ saldoResultante: number }> {
  // Si el documento ya bloqueó sus productos, dentro de la misma transacción este bloqueo no espera.
  const producto = (await bloquearProductos(tx, [movimiento.productoId])).get(movimiento.productoId)!;

  // El saldo se toma del stock actual: es igual al saldo del último movimiento (RN-50), y leer la fila
  // ya bloqueada es más simple que buscar ese movimiento.
  const saldoResultante = producto.stockActual + movimiento.cantidad;

  // El stock nunca queda negativo (RN-32, FR-016). La base lo respalda con sus CHECK.
  if (saldoResultante < 0) {
    throw new ErrorDeNegocio(
      `Stock insuficiente de '${producto.nombre}': hay ${producto.stockActual} y se necesitan ${Math.abs(movimiento.cantidad)}`,
    );
  }

  await tx.movimientoInventario.create({
    data: {
      productoId: movimiento.productoId,
      tipo: movimiento.tipo,
      cantidad: movimiento.cantidad,
      saldoResultante,
      fechaDocumento: movimiento.fechaDocumento,
      compraId: movimiento.compraId,
      distribucionId: movimiento.distribucionId,
      usuarioId: movimiento.usuarioId,
    },
  });
  await tx.producto.update({ where: { id: movimiento.productoId }, data: { stockActual: saldoResultante } });

  return { saldoResultante };
}

/**
 * Consulta de existencias (FR-018, research K-07): stock actual frente al mínimo.
 * Primero los bajo mínimo, para ver de un vistazo qué hay que comprar (SC-007), y luego por nombre.
 * Se filtra en memoria como los catálogos: son decenas de productos (research C-01).
 */
export async function listarExistencias({
  q,
  categoriaId,
  estado,
  soloBajoMinimo = false,
}: {
  q?: string;
  categoriaId?: number;
  estado: FiltroExistencias["estado"];
  soloBajoMinimo?: boolean;
}) {
  const productos = await prisma.producto.findMany({
    where: { categoriaId },
    include: { categoria: { select: { nombre: true } }, unidadMedida: { select: { nombre: true, abreviatura: true } } },
  });

  const filas = productos
    // Por defecto se ven los activos y también los inactivos que todavía tienen stock: ese stock existe
    // en el almacén aunque el producto ya no se compre (aclaración del 13/09).
    .filter((p) => (estado === "todos" ? true : estado === "inactivos" ? !p.activo : p.activo || p.stockActual > 0))
    .filter((p) => coincideBusqueda(q, p.codigo, p.nombre))
    .map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      categoria: p.categoria.nombre,
      unidad: p.unidadMedida.nombre,
      abreviatura: p.unidadMedida.abreviatura,
      stockActual: p.stockActual,
      stockMinimo: p.stockMinimo,
      activo: p.activo,
      // RN-52: solo un producto activo está bajo mínimo; uno inactivo no se va a reponer.
      bajoMinimo: estaBajoMinimo(p),
    }))
    .filter((p) => !soloBajoMinimo || p.bajoMinimo)
    .sort((a, b) => Number(b.bajoMinimo) - Number(a.bajoMinimo) || compararEnEspanol(a.nombre, b.nombre));

  return { productos: filas, total: filas.length, bajoMinimo: filas.filter((p) => p.bajoMinimo).length };
}
