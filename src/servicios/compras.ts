// Compras (F-003). Una compra se guarda completa —cabecera, líneas y un movimiento de entrada por
// línea— o no se guarda (RN-20, defecto X-01). Nunca se edita ni se borra: si tiene errores, se anula
// (D-16, principio IV).
import { Prisma } from "@/generado/prisma/client";
import type { DatosCompra } from "@/esquemas/compras";
import { ErrorDeNegocio } from "@/lib/errores";
import { aFechaDocumento, textoDeFechaDocumento } from "@/lib/fechas";
import { esErrorDeDuplicado, prisma } from "@/lib/prisma";
import { bloquearProductos, registrarMovimiento } from "./inventario";

/** Máximo de la columna decimal(12,2) del total. */
const TOTAL_MAXIMO = new Prisma.Decimal("9999999999.99");

/**
 * Por defecto Prisma espera 2 s por una conexión y corta la transacción a los 5 s. Con varias compras
 * simultáneas esperando el bloqueo del mismo producto, esos límites se alcanzarían sin que haya un
 * error real (research K-12).
 */
const OPCIONES_TRANSACCION = { maxWait: 10_000, timeout: 10_000 };


/** Compra REGISTRADA del proveedor con ese Nº de factura, si existe (RN-21, RN-26). */
export function buscarFacturaVigente(proveedorId: number, nroFactura: string) {
  return prisma.compra.findFirst({ where: { proveedorId, nroFactura, estado: "REGISTRADA" }, select: { id: true } });
}

function errorFacturaDuplicada(nroFactura: string, compraId?: number) {
  return new ErrorDeNegocio(
    `La factura ${nroFactura} ya está registrada para este proveedor`,
    "nroFactura",
    compraId ? { texto: "Ver compra", ruta: `/compras/${compraId}` } : undefined,
  );
}

/** Verificaciones con mensajes claros antes de abrir la transacción: proveedor y productos activos (RN-14). */
async function verificarProveedorYProductos(datos: DatosCompra) {
  const proveedor = await prisma.proveedor.findUnique({ where: { id: datos.proveedorId }, select: { razonSocial: true, activo: true } });
  if (!proveedor) throw new ErrorDeNegocio("No existe el proveedor elegido", "proveedorId");
  if (!proveedor.activo) throw new ErrorDeNegocio(`El proveedor '${proveedor.razonSocial}' está inactivo: elige uno activo`, "proveedorId");

  const productos = await prisma.producto.findMany({
    where: { id: { in: datos.lineas.map((linea) => linea.productoId) } },
    select: { id: true, nombre: true, activo: true },
  });
  const porId = new Map(productos.map((producto) => [producto.id, producto]));

  datos.lineas.forEach((linea, indice) => {
    const producto = porId.get(linea.productoId);
    const campo = `lineas.${indice}.productoId`;
    if (!producto) throw new ErrorDeNegocio(`Línea ${indice + 1}: no existe el producto elegido`, campo);
    if (!producto.activo) throw new ErrorDeNegocio(`Línea ${indice + 1}: el producto '${producto.nombre}' está inactivo: elige uno activo`, campo);
  });
}

/**
 * Registra una compra con sus líneas y sus movimientos de entrada (FR-001 a FR-006).
 * Orden (research K-11): verificaciones → cálculo de montos → una transacción que bloquea los
 * productos, crea la compra con sus líneas y registra un ENTRADA_COMPRA por línea.
 */
export async function registrarCompra(datos: DatosCompra, usuarioId: number): Promise<{ id: number }> {
  await verificarProveedorYProductos(datos);

  // RN-21: se avisa antes con un mensaje claro; si dos personas guardan la misma factura a la vez,
  // decide el índice único parcial de la base (ver el catch).
  const vigente = await buscarFacturaVigente(datos.proveedorId, datos.nroFactura);
  if (vigente) throw errorFacturaDuplicada(datos.nroFactura, vigente.id);

  // RN-23: subtotales y total los calcula el servidor con decimales exactos. Nada de lo que envíe el
  // formulario se usa como monto (defecto X-14).
  const lineas = datos.lineas.map((linea) => {
    const precioUnitario = new Prisma.Decimal(linea.precioUnitario);
    return { productoId: linea.productoId, cantidad: linea.cantidad, precioUnitario, subtotal: precioUnitario.mul(linea.cantidad) };
  });
  const total = lineas.reduce((suma, linea) => suma.add(linea.subtotal), new Prisma.Decimal(0));
  if (total.gt(TOTAL_MAXIMO)) throw new ErrorDeNegocio("El total de la compra no puede superar Bs 9.999.999.999,99", "lineas");

  try {
    return await prisma.$transaction(async (tx) => {
      // Primero se bloquean los productos: insertar las líneas toma sobre ellos un bloqueo FOR KEY SHARE
      // que, si se bloqueara después, haría esperar a dos compras simultáneas una por la otra (K-01).
      await bloquearProductos(
        tx,
        lineas.map((linea) => linea.productoId),
      );

      const compra = await tx.compra.create({
        data: {
          proveedorId: datos.proveedorId,
          nroFactura: datos.nroFactura,
          fecha: aFechaDocumento(datos.fecha),
          observacion: datos.observacion ?? null,
          total,
          usuarioId,
          lineas: { create: lineas },
        },
        select: { id: true, fecha: true },
      });

      // RN-24: un movimiento de entrada por línea, en orden de producto, con la fecha de la compra (RN-53).
      for (const linea of [...lineas].sort((a, b) => a.productoId - b.productoId)) {
        await registrarMovimiento(tx, {
          productoId: linea.productoId,
          tipo: "ENTRADA_COMPRA",
          cantidad: linea.cantidad,
          fechaDocumento: compra.fecha,
          compraId: compra.id,
          usuarioId,
        });
      }

      return { id: compra.id };
    }, OPCIONES_TRANSACCION);
  } catch (error) {
    // Dos registros simultáneos de la misma factura: la base rechazó el segundo y la transacción se
    // deshizo completa, sin cambiar ningún stock.
    if (esErrorDeDuplicado(error)) {
      const guardada = await buscarFacturaVigente(datos.proveedorId, datos.nroFactura);
      if (guardada) throw errorFacturaDuplicada(datos.nroFactura, guardada.id);
    }
    throw error;
  }
}

/** "faltan 7 unidades de 'Lavandina 1 L' (stock actual 3, a revertir 10)" */
function describirFaltante(nombre: string, stockActual: number, aRevertir: number) {
  const falta = aRevertir - stockActual;
  const cuanto = falta === 1 ? "falta 1 unidad" : `faltan ${falta} unidades`;
  return `${cuanto} de '${nombre}' (stock actual ${stockActual}, a revertir ${aRevertir})`;
}

/**
 * Anula una compra con motivo (FR-011 a FR-014, research K-02). Es completa o no ocurre:
 *
 * 1. Cambia el estado a ANULADA solo si sigue REGISTRADA. Esa actualización bloquea la fila de la
 *    compra: si dos personas anulan a la vez, la segunda espera y luego ya no la encuentra REGISTRADA.
 * 2. Bloquea todos los productos de la compra y calcula TODOS los faltantes. Si algún producto quedaría
 *    con stock negativo porque ya se distribuyó, rechaza con un único mensaje que los nombra a todos
 *    (RN-25) y la transacción se deshace: la compra sigue REGISTRADA.
 * 3. Registra un ANULACION_COMPRA negativo por línea, con la fecha de la compra anulada (RN-53).
 */
export async function anularCompra(compraId: number, motivo: string, usuarioId: number): Promise<{ productoIds: number[] }> {
  return prisma.$transaction(async (tx) => {
    const cambio = await tx.compra.updateMany({
      where: { id: compraId, estado: "REGISTRADA" },
      data: { estado: "ANULADA", motivoAnulacion: motivo, anuladaEn: new Date(), anuladaPorId: usuarioId },
    });
    if (cambio.count === 0) {
      const existe = await tx.compra.findUnique({ where: { id: compraId }, select: { id: true } });
      // RN-26: una compra anulada no se vuelve a anular.
      throw new ErrorDeNegocio(existe ? "La compra ya está anulada" : "No existe la compra indicada");
    }

    const compra = await tx.compra.findUniqueOrThrow({
      where: { id: compraId },
      select: { fecha: true, lineas: { select: { productoId: true, cantidad: true } } },
    });
    const lineas = [...compra.lineas].sort((a, b) => a.productoId - b.productoId);
    const productos = await bloquearProductos(
      tx,
      lineas.map((linea) => linea.productoId),
    );

    const faltantes = lineas.flatMap((linea) => {
      const producto = productos.get(linea.productoId)!;
      return producto.stockActual < linea.cantidad ? [describirFaltante(producto.nombre, producto.stockActual, linea.cantidad)] : [];
    });
    if (faltantes.length > 0) throw new ErrorDeNegocio(`No se puede anular: ${faltantes.join("; ")}`);

    for (const linea of lineas) {
      await registrarMovimiento(tx, {
        productoId: linea.productoId,
        tipo: "ANULACION_COMPRA",
        cantidad: -linea.cantidad,
        fechaDocumento: compra.fecha,
        compraId,
        usuarioId,
      });
    }

    return { productoIds: lineas.map((linea) => linea.productoId) };
  }, OPCIONES_TRANSACCION);
}

/** Las compras crecen sin límite (36 meses simulados): el listado se pagina (research K-09). */
export const COMPRAS_POR_PAGINA = 50;

/**
 * Listado de compras (FR-008): filtros en la base por rango de fechas de la factura, proveedor, estado
 * y Nº de factura que empieza con lo escrito; de la más reciente a la más antigua.
 */
export async function listarCompras(filtro: {
  desde: string;
  hasta: string;
  proveedorId?: number;
  estado: "todas" | "registradas" | "anuladas";
  factura?: string;
  pagina: number;
}) {
  const where: Prisma.CompraWhereInput = {
    fecha: { gte: aFechaDocumento(filtro.desde), lte: aFechaDocumento(filtro.hasta) },
    proveedorId: filtro.proveedorId,
    estado: filtro.estado === "todas" ? undefined : filtro.estado === "registradas" ? "REGISTRADA" : "ANULADA",
    nroFactura: filtro.factura ? { startsWith: filtro.factura } : undefined,
  };

  const [compras, total] = await Promise.all([
    prisma.compra.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      skip: (filtro.pagina - 1) * COMPRAS_POR_PAGINA,
      take: COMPRAS_POR_PAGINA,
      include: { proveedor: { select: { razonSocial: true } }, _count: { select: { lineas: true } } },
    }),
    prisma.compra.count({ where }),
  ]);

  return {
    total,
    compras: compras.map((compra) => ({
      id: compra.id,
      fecha: textoDeFechaDocumento(compra.fecha),
      nroFactura: compra.nroFactura,
      proveedor: compra.proveedor.razonSocial,
      items: compra._count.lineas,
      total: compra.total.toFixed(2),
      estado: compra.estado,
    })),
  };
}

/** Detalle completo de una compra, con los datos de registro y de anulación (FR-009), o null. */
export async function obtenerCompra(id: number) {
  const compra = await prisma.compra.findUnique({
    where: { id },
    include: {
      proveedor: { select: { id: true, razonSocial: true, nit: true, activo: true } },
      usuario: { select: { nombre: true, apellido: true } },
      anuladaPor: { select: { nombre: true, apellido: true } },
      lineas: {
        orderBy: { id: "asc" },
        include: { producto: { select: { id: true, codigo: true, nombre: true, activo: true, unidadMedida: { select: { abreviatura: true } } } } },
      },
    },
  });
  if (!compra) return null;

  return {
    id: compra.id,
    nroFactura: compra.nroFactura,
    fecha: textoDeFechaDocumento(compra.fecha),
    observacion: compra.observacion,
    total: compra.total.toFixed(2),
    estado: compra.estado,
    proveedor: compra.proveedor,
    registradaPor: `${compra.usuario.nombre} ${compra.usuario.apellido}`,
    registradaEn: compra.creadoEn,
    motivoAnulacion: compra.motivoAnulacion,
    anuladaPor: compra.anuladaPor ? `${compra.anuladaPor.nombre} ${compra.anuladaPor.apellido}` : null,
    anuladaEn: compra.anuladaEn,
    lineas: compra.lineas.map((linea) => ({
      id: linea.id,
      productoId: linea.producto.id,
      codigo: linea.producto.codigo,
      nombre: linea.producto.nombre,
      productoActivo: linea.producto.activo,
      unidad: linea.producto.unidadMedida.abreviatura,
      cantidad: linea.cantidad,
      precioUnitario: linea.precioUnitario.toFixed(2),
      subtotal: linea.subtotal.toFixed(2),
    })),
  };
}
