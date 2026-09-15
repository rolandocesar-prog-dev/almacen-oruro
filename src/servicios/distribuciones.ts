// Distribuciones (F-005). Una distribución entrega productos a un representante contra UN pedido y se
// guarda completa —cabecera, líneas, un movimiento de salida por línea y lo entregado del pedido— o no se
// guarda (RN-30). Nunca se edita ni se borra: si tiene errores, se anula con motivo (D-16, principio IV).
//
// Regla de concurrencia en una frase: "primero bloqueo el pedido, después los productos" (research V-01,
// P-03, K-01). Con el pedido bloqueado, dos distribuciones del mismo pedido se ordenan solas y la segunda
// ve el pendiente nuevo; con los productos bloqueados, ven el stock vigente. El stock solo cambia con
// registrarMovimiento() y el estado del pedido solo con recalcularEstadoPedido().
import type { Prisma } from "@/generado/prisma/client";
import type { DatosDistribucion } from "@/esquemas/distribuciones";
import { ErrorDeNegocio } from "@/lib/errores";
import { aFechaDocumento, formatearFecha, textoDeFechaDocumento } from "@/lib/fechas";
import { esErrorDeDuplicado, prisma } from "@/lib/prisma";
import { bloquearProductos, registrarMovimiento } from "./inventario";
import { bloquearPedido, recalcularEstadoPedido } from "./pedidos";

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

function errorValeDuplicado(nroVale: string, distribucionId?: number) {
  return new ErrorDeNegocio(
    `El vale ${nroVale} ya está registrado`,
    "nroVale",
    distribucionId ? { texto: "Ver distribución", ruta: `/distribuciones/${distribucionId}` } : undefined,
  );
}

/**
 * Pedido preparado para el formulario de distribución (FR-002, RN-36): representante con su servicio y,
 * por cada línea, lo solicitado, lo entregado, lo pendiente, el stock y el máximo entregable. El stock es
 * informativo: puede cambiar antes de guardar, y la verificación con autoridad se hace al registrar.
 */
export async function obtenerPedidoParaDistribuir(pedidoId: number) {
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: {
      representante: { select: { id: true, nombre: true, apellido: true, servicio: true, activo: true, centroSalud: { select: { nombre: true } } } },
      lineas: {
        orderBy: { id: "asc" },
        include: {
          producto: { select: { id: true, codigo: true, nombre: true, activo: true, stockActual: true, unidadMedida: { select: { abreviatura: true } } } },
        },
      },
    },
  });
  if (!pedido) return null;

  return {
    id: pedido.id,
    fecha: textoDeFechaDocumento(pedido.fecha),
    estado: pedido.estado,
    representante: {
      id: pedido.representante.id,
      nombre: pedido.representante.nombre,
      apellido: pedido.representante.apellido,
      servicio: pedido.representante.servicio,
      activo: pedido.representante.activo,
      centroSalud: pedido.representante.centroSalud.nombre,
    },
    lineas: pedido.lineas.map((linea) => {
      const pendiente = linea.cantidadSolicitada - linea.cantidadEntregada;
      return {
        pedidoDetalleId: linea.id,
        productoId: linea.producto.id,
        codigo: linea.producto.codigo,
        nombre: linea.producto.nombre,
        productoActivo: linea.producto.activo,
        unidad: linea.producto.unidadMedida.abreviatura,
        solicitada: linea.cantidadSolicitada,
        entregada: linea.cantidadEntregada,
        pendiente,
        stockActual: linea.producto.stockActual,
        ...situacionDeLinea(pendiente, linea.producto.stockActual),
      };
    }),
  };
}

/**
 * Registra una distribución (FR-001 a FR-008, RN-30 a RN-34; research V-01). Pasos:
 *
 * 1. Antes de la transacción: el vale no está en otra distribución REGISTRADA (aviso claro, RN-31).
 * 2. En una transacción:
 *    a. Bloquea el PEDIDO y mira su estado: solo se distribuye lo PENDIENTE o PARCIAL.
 *    b. Lee la fecha y las líneas del pedido con lo entregado vigente; verifica fecha y pertenencia.
 *    c. Bloquea los PRODUCTOS, en orden de id y antes de insertar filas que los referencien (K-01).
 *    d. Verifica todas las cantidades contra el pendiente y el stock bloqueados (RN-32).
 *    e. Crea la distribución con sus líneas.
 *    f. Registra un SALIDA_DISTRIBUCION por línea con la fecha de la distribución (RN-34, RN-53).
 *    g. Suma lo entregado a cada línea del pedido y recalcula su estado (RN-41).
 *
 * Si cualquier paso falla, la transacción se deshace entera: no queda cabecera, línea, movimiento ni
 * cambio en el pedido (RN-30). Así se corrige el stock negativo de 2022 (X-03).
 */
export async function registrarDistribucion(
  datos: DatosDistribucion,
  usuarioId: number,
): Promise<{ id: number; pedidoId: number; productoIds: number[] }> {
  const vigente = await buscarValeVigente(datos.nroVale);
  if (vigente) throw errorValeDuplicado(datos.nroVale, vigente.id);

  // RN-33: solo las filas con cantidad se entregan; el índice de la fila se conserva para los mensajes.
  const entregas = datos.lineas.flatMap((linea, indice) =>
    linea.cantidad === undefined ? [] : [{ indice, pedidoDetalleId: linea.pedidoDetalleId, cantidad: linea.cantidad }],
  );

  try {
    return await prisma.$transaction(async (tx) => {
      // a. Primero el pedido: quien llega segundo espera y ve el estado y lo entregado que dejó el primero.
      const bloqueado = await bloquearPedido(tx, datos.pedidoId);
      if (!bloqueado) throw new ErrorDeNegocio("No existe el pedido indicado");
      if (bloqueado.estado === "ATENDIDO") throw new ErrorDeNegocio("El pedido ya está atendido: no queda nada por entregar");
      if (bloqueado.estado === "ANULADO") throw new ErrorDeNegocio("El pedido está anulado: no se puede distribuir");

      // b. Fecha y líneas vigentes del pedido.
      const pedido = await tx.pedido.findUniqueOrThrow({
        where: { id: datos.pedidoId },
        select: { fecha: true, lineas: { select: { id: true, productoId: true, cantidadSolicitada: true, cantidadEntregada: true } } },
      });
      const fechaPedido = textoDeFechaDocumento(pedido.fecha);
      // No se entrega antes de que exista el pedido; que no sea futura ya lo verificó el esquema.
      if (datos.fecha < fechaPedido) {
        throw new ErrorDeNegocio(`La fecha de la distribución debe estar entre el ${formatearFecha(fechaPedido)} y hoy`, "fecha");
      }
      const lineaDelPedido = new Map(pedido.lineas.map((linea) => [linea.id, linea]));
      for (const entrega of entregas) {
        if (!lineaDelPedido.has(entrega.pedidoDetalleId)) {
          throw new ErrorDeNegocio(`Línea ${entrega.indice + 1}: el producto no pertenece al pedido`, `lineas.${entrega.indice}.pedidoDetalleId`);
        }
      }

      // c. Después los productos, con su stock vigente.
      const productos = await bloquearProductos(
        tx,
        entregas.map((entrega) => lineaDelPedido.get(entrega.pedidoDetalleId)!.productoId),
      );

      // d. RN-32: cada cantidad ≤ pendiente y ≤ stock. Se informan TODAS las líneas que se exceden, para
      //    corregir de una vez (FR-009).
      const excedidas = entregas.flatMap((entrega) => {
        const linea = lineaDelPedido.get(entrega.pedidoDetalleId)!;
        const producto = productos.get(linea.productoId)!;
        const pendiente = linea.cantidadSolicitada - linea.cantidadEntregada;
        const { maximoEntregable } = situacionDeLinea(pendiente, producto.stockActual);
        if (entrega.cantidad <= maximoEntregable) return [];
        const mensaje = `${producto.nombre}: puedes entregar como máximo ${maximoEntregable} (pendiente ${pendiente}, stock ${producto.stockActual})`;
        return [{ indice: entrega.indice, mensaje }];
      });
      if (excedidas.length > 0) {
        throw new ErrorDeNegocio(excedidas.map((excedida) => excedida.mensaje).join("; "), `lineas.${excedidas[0]!.indice}.cantidad`);
      }

      // e. La distribución no guarda representante ni producto: salen del pedido y de su línea (X-08).
      const distribucion = await tx.distribucion.create({
        data: {
          pedidoId: datos.pedidoId,
          nroVale: datos.nroVale,
          fecha: aFechaDocumento(datos.fecha),
          observacion: datos.observacion ?? null,
          usuarioId,
          lineas: { create: entregas.map((entrega) => ({ pedidoDetalleId: entrega.pedidoDetalleId, cantidad: entrega.cantidad })) },
        },
        select: { id: true, fecha: true },
      });

      // f. Un movimiento de salida por línea, en orden de producto (principio III).
      const conProducto = entregas
        .map((entrega) => ({ ...entrega, productoId: lineaDelPedido.get(entrega.pedidoDetalleId)!.productoId }))
        .sort((a, b) => a.productoId - b.productoId);
      for (const entrega of conProducto) {
        await registrarMovimiento(tx, {
          productoId: entrega.productoId,
          tipo: "SALIDA_DISTRIBUCION",
          cantidad: -entrega.cantidad,
          fechaDocumento: distribucion.fecha,
          distribucionId: distribucion.id,
          usuarioId,
        });
      }

      // g. Lo entregado del pedido y su estado, en la misma transacción (RN-34, RN-41).
      for (const entrega of entregas) {
        await tx.pedidoDetalle.update({ where: { id: entrega.pedidoDetalleId }, data: { cantidadEntregada: { increment: entrega.cantidad } } });
      }
      await recalcularEstadoPedido(tx, datos.pedidoId);

      return { id: distribucion.id, pedidoId: datos.pedidoId, productoIds: conProducto.map((entrega) => entrega.productoId) };
    }, OPCIONES_TRANSACCION);
  } catch (error) {
    // Dos registros simultáneos con el mismo vale: el índice único parcial rechazó el segundo y la
    // transacción se deshizo completa, sin tocar stock ni pedido (V-04).
    if (esErrorDeDuplicado(error)) {
      const guardada = await buscarValeVigente(datos.nroVale);
      if (guardada) throw errorValeDuplicado(datos.nroVale, guardada.id);
    }
    throw error;
  }
}

/**
 * Anula una distribución con motivo (FR-013 a FR-015, RN-35; research V-06). Es completa o no ocurre:
 *
 * 1. Bloquea el PEDIDO, igual que el registro: así una anulación y un registro del mismo pedido nunca se
 *    esperan en círculo.
 * 2. Cambia la distribución a ANULADA solo si sigue REGISTRADA. Esa actualización bloquea su fila: si dos
 *    personas anulan a la vez, la segunda espera y luego ya no la encuentra REGISTRADA (una sola reversión).
 * 3. Bloquea los PRODUCTOS y registra un ANULACION_DISTRIBUCION positivo por línea, con la fecha de la
 *    distribución anulada (RN-53). No hace falta verificar stock: una anulación de distribución solo suma.
 * 4. Resta la cantidad de lo entregado de cada línea y recalcula el estado del pedido; un pedido ANULADO
 *    sigue ANULADO y su saldo anulado sube (RN-35).
 *
 * Se permite sin plazo, igual que en compras: los totales de su período cambian en consultas posteriores.
 */
export async function anularDistribucion(id: number, motivo: string, usuarioId: number): Promise<{ pedidoId: number; productoIds: number[] }> {
  // El pedido de una distribución no cambia nunca: se puede leer antes de bloquear.
  const existente = await prisma.distribucion.findUnique({ where: { id }, select: { pedidoId: true } });
  if (!existente) throw new ErrorDeNegocio("No existe la distribución indicada");
  const { pedidoId } = existente;

  return prisma.$transaction(async (tx) => {
    await bloquearPedido(tx, pedidoId);

    const cambio = await tx.distribucion.updateMany({
      where: { id, estado: "REGISTRADA" },
      data: { estado: "ANULADA", motivoAnulacion: motivo, anuladaEn: new Date(), anuladaPorId: usuarioId },
    });
    // FR-015: una distribución anulada no se vuelve a anular.
    if (cambio.count === 0) throw new ErrorDeNegocio("La distribución ya está anulada");

    const distribucion = await tx.distribucion.findUniqueOrThrow({
      where: { id },
      select: { fecha: true, lineas: { select: { cantidad: true, pedidoDetalleId: true, pedidoDetalle: { select: { productoId: true } } } } },
    });
    const lineas = distribucion.lineas
      .map((linea) => ({ cantidad: linea.cantidad, pedidoDetalleId: linea.pedidoDetalleId, productoId: linea.pedidoDetalle.productoId }))
      .sort((a, b) => a.productoId - b.productoId);

    await bloquearProductos(
      tx,
      lineas.map((linea) => linea.productoId),
    );
    for (const linea of lineas) {
      await registrarMovimiento(tx, {
        productoId: linea.productoId,
        tipo: "ANULACION_DISTRIBUCION",
        cantidad: linea.cantidad,
        fechaDocumento: distribucion.fecha,
        distribucionId: id,
        usuarioId,
      });
    }

    for (const linea of lineas) {
      await tx.pedidoDetalle.update({ where: { id: linea.pedidoDetalleId }, data: { cantidadEntregada: { decrement: linea.cantidad } } });
    }
    await recalcularEstadoPedido(tx, pedidoId);

    return { pedidoId, productoIds: lineas.map((linea) => linea.productoId) };
  }, OPCIONES_TRANSACCION);
}

/**
 * Listado de distribuciones (FR-010, research V-07): filtros en la base por rango de fechas, representante
 * (el del pedido, X-08), producto (alguna línea), estado y Nº de vale que empieza con lo escrito; de la más
 * reciente a la más antigua.
 */
export async function listarDistribuciones(filtro: {
  desde: string;
  hasta: string;
  representanteId?: number;
  productoId?: number;
  estado: "todas" | "registradas" | "anuladas";
  vale?: string;
  pagina: number;
}) {
  const where: Prisma.DistribucionWhereInput = {
    fecha: { gte: aFechaDocumento(filtro.desde), lte: aFechaDocumento(filtro.hasta) },
    pedido: filtro.representanteId ? { representanteId: filtro.representanteId } : undefined,
    lineas: filtro.productoId ? { some: { pedidoDetalle: { productoId: filtro.productoId } } } : undefined,
    estado: filtro.estado === "todas" ? undefined : filtro.estado === "registradas" ? "REGISTRADA" : "ANULADA",
    nroVale: filtro.vale ? { startsWith: filtro.vale } : undefined,
  };

  const [distribuciones, total] = await Promise.all([
    prisma.distribucion.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      skip: (filtro.pagina - 1) * DISTRIBUCIONES_POR_PAGINA,
      take: DISTRIBUCIONES_POR_PAGINA,
      include: {
        pedido: { select: { id: true, representante: { select: { nombre: true, apellido: true, servicio: true } } } },
        _count: { select: { lineas: true } },
      },
    }),
    prisma.distribucion.count({ where }),
  ]);

  // Unidades entregadas por distribución, solo de las filas de esta página, en una consulta.
  const sumas = await prisma.distribucionDetalle.groupBy({
    by: ["distribucionId"],
    where: { distribucionId: { in: distribuciones.map((distribucion) => distribucion.id) } },
    _sum: { cantidad: true },
  });
  const unidadesPorDistribucion = new Map(sumas.map((suma) => [suma.distribucionId, suma._sum.cantidad ?? 0]));

  return {
    total,
    distribuciones: distribuciones.map((distribucion) => ({
      id: distribucion.id,
      fecha: textoDeFechaDocumento(distribucion.fecha),
      nroVale: distribucion.nroVale,
      pedidoId: distribucion.pedido.id,
      representante: `${distribucion.pedido.representante.apellido}, ${distribucion.pedido.representante.nombre}`,
      servicio: distribucion.pedido.representante.servicio,
      productos: distribucion._count.lineas,
      unidades: unidadesPorDistribucion.get(distribucion.id) ?? 0,
      estado: distribucion.estado,
    })),
  };
}

/** Detalle de una distribución (FR-011, FR-016), con el representante tomado del pedido (X-08), o null. */
export async function obtenerDistribucion(id: number) {
  const distribucion = await prisma.distribucion.findUnique({
    where: { id },
    include: {
      pedido: {
        select: {
          id: true,
          fecha: true,
          estado: true,
          representante: { select: { id: true, nombre: true, apellido: true, servicio: true, activo: true, centroSalud: { select: { nombre: true } } } },
        },
      },
      usuario: { select: { nombre: true, apellido: true } },
      anuladaPor: { select: { nombre: true, apellido: true } },
      lineas: {
        orderBy: { id: "asc" },
        include: {
          pedidoDetalle: {
            select: { producto: { select: { id: true, codigo: true, nombre: true, activo: true, unidadMedida: { select: { abreviatura: true } } } } },
          },
        },
      },
    },
  });
  if (!distribucion) return null;

  const { representante } = distribucion.pedido;
  return {
    id: distribucion.id,
    nroVale: distribucion.nroVale,
    fecha: textoDeFechaDocumento(distribucion.fecha),
    observacion: distribucion.observacion,
    estado: distribucion.estado,
    pedido: { id: distribucion.pedido.id, fecha: textoDeFechaDocumento(distribucion.pedido.fecha), estado: distribucion.pedido.estado },
    representante: {
      id: representante.id,
      nombre: representante.nombre,
      apellido: representante.apellido,
      servicio: representante.servicio,
      activo: representante.activo,
      centroSalud: representante.centroSalud.nombre,
    },
    registradaPor: `${distribucion.usuario.nombre} ${distribucion.usuario.apellido}`,
    registradaEn: distribucion.creadoEn,
    motivoAnulacion: distribucion.motivoAnulacion,
    anuladaPor: distribucion.anuladaPor ? `${distribucion.anuladaPor.nombre} ${distribucion.anuladaPor.apellido}` : null,
    anuladaEn: distribucion.anuladaEn,
    lineas: distribucion.lineas.map((linea) => ({
      id: linea.id,
      productoId: linea.pedidoDetalle.producto.id,
      codigo: linea.pedidoDetalle.producto.codigo,
      nombre: linea.pedidoDetalle.producto.nombre,
      productoActivo: linea.pedidoDetalle.producto.activo,
      unidad: linea.pedidoDetalle.producto.unidadMedida.abreviatura,
      cantidad: linea.cantidad,
    })),
  };
}
