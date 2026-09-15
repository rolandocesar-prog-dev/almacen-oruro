// Pedidos (F-004). El pedido registra lo que un representante necesita; NO mueve stock (FR-003): el stock
// sale al distribuir (F-005). Su estado no se elige: se calcula a partir de lo entregado de cada línea,
// salvo la anulación con motivo (RN-41, RN-43).
//
// Regla de concurrencia en una frase: "bloqueo el pedido y veo su estado" (research P-03). Editar,
// anular y distribuir (F-005) empiezan bloqueando la fila del pedido; quien llega segundo espera y, al
// continuar, ve el estado que dejó el primero. En todo el sistema se bloquea primero el pedido y después
// los productos, así una distribución y una compra nunca se esperan en círculo.
import type { EstadoPedido, Prisma } from "@/generado/prisma/client";
import type { DatosPedido, EstadoFiltroPedidos } from "@/esquemas/pedidos";
import { ErrorDeNegocio } from "@/lib/errores";
import { aFechaDocumento, textoDeFechaDocumento } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import { compararEnEspanol } from "@/lib/texto";

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

/** Lo que un pedido ya tenía antes de editarlo: se puede conservar aunque se haya desactivado (FR-006). */
type ValoresConservados = { representanteId?: number; productoIds?: number[] };

/**
 * Representante y productos existentes y activos (RN-14, FR-001), con mensajes que dicen qué corregir.
 * Al editar, se acepta el representante o un producto que el pedido ya tenía aunque esté inactivo: pudo
 * desactivarse mientras el pedido estaba ATENDIDO y volver a PENDIENTE al anularse una distribución
 * (spec, caso borde; FR-003 de F-002). Lo que no se puede es elegir otro inactivo.
 */
async function verificarRepresentanteYProductos(db: Transaccion, datos: DatosPedido, conservados: ValoresConservados = {}) {
  const representante = await db.representante.findUnique({
    where: { id: datos.representanteId },
    select: { nombre: true, apellido: true, activo: true },
  });
  if (!representante) throw new ErrorDeNegocio("No existe el representante elegido", "representanteId");
  if (!representante.activo && datos.representanteId !== conservados.representanteId) {
    throw new ErrorDeNegocio(`El representante '${representante.apellido}, ${representante.nombre}' está inactivo: elige uno activo`, "representanteId");
  }

  const productos = await db.producto.findMany({
    where: { id: { in: datos.lineas.map((linea) => linea.productoId) } },
    select: { id: true, nombre: true, activo: true },
  });
  const porId = new Map(productos.map((producto) => [producto.id, producto]));
  const yaEstaban = new Set(conservados.productoIds ?? []);

  datos.lineas.forEach((linea, indice) => {
    const producto = porId.get(linea.productoId);
    const campo = `lineas.${indice}.productoId`;
    if (!producto) throw new ErrorDeNegocio(`Línea ${indice + 1}: no existe el producto elegido`, campo);
    if (!producto.activo && !yaEstaban.has(producto.id)) {
      throw new ErrorDeNegocio(`Línea ${indice + 1}: el producto '${producto.nombre}' está inactivo: elige uno activo`, campo);
    }
  });
}

/**
 * Registra un pedido PENDIENTE con sus líneas (FR-001 a FR-004, FR-007; research P-05).
 * Las verificaciones van antes, con mensajes claros; después, un único create anidado que Prisma
 * ejecuta de forma atómica: se guardan cabecera y líneas juntas o nada (FR-004).
 * FR-003: registrar un pedido NO toca el stock ni el kardex; por eso no bloquea productos.
 */
export async function registrarPedido(datos: DatosPedido, usuarioId: number): Promise<{ id: number }> {
  await verificarRepresentanteYProductos(prisma, datos);

  const pedido = await prisma.pedido.create({
    data: {
      representanteId: datos.representanteId,
      fecha: aFechaDocumento(datos.fecha),
      observacion: datos.observacion ?? null,
      // Un pedido recién registrado no tiene entregas: PENDIENTE y entregado 0 en cada línea (RN-41).
      estado: "PENDIENTE",
      usuarioId,
      lineas: { create: datos.lineas.map((linea) => ({ productoId: linea.productoId, cantidadSolicitada: linea.cantidadSolicitada })) },
    },
    select: { id: true },
  });
  // El número del pedido es su id (research P-01): lo asigna la base y nunca cambia ni se repite.
  return { id: pedido.id };
}

/**
 * Productos para las líneas del pedido: activos (RN-14) y, al editar, los que el pedido ya tenía
 * (FR-006). Cada uno con su stock actual, que el formulario muestra solo como información (FR-005).
 */
export async function listarProductosParaPedido(idsActuales: number[] = []) {
  const productos = await prisma.producto.findMany({
    where: { OR: [{ activo: true }, ...(idsActuales.length > 0 ? [{ id: { in: idsActuales } }] : [])] },
    select: { id: true, codigo: true, nombre: true, activo: true, stockActual: true, unidadMedida: { select: { abreviatura: true } } },
  });
  return productos
    .sort((a, b) => compararEnEspanol(a.nombre, b.nombre))
    .map(({ id, codigo, nombre, activo, stockActual, unidadMedida }) => {
      const etiqueta = `${codigo} · ${nombre}`;
      return { id, etiqueta: activo ? etiqueta : `${etiqueta} (inactivo)`, stockActual, abreviatura: unidadMedida.abreviatura };
    });
}

/**
 * Acciones que ofrece el pedido según su estado (FR-015, research P-08). Se deciden en un solo lugar y el
 * servidor vuelve a verificar la regla en cada acción, con el pedido bloqueado.
 *
 * | Estado             | Editar | Anular | Distribuir |
 * |--------------------|--------|--------|------------|
 * | PENDIENTE          | sí     | sí     | sí         |
 * | PARCIAL            | —      | sí     | sí         |
 * | ATENDIDO, ANULADO  | —      | —      | —          |
 */
export function accionesSegunEstado(estado: EstadoPedido) {
  const porAtender = estado === "PENDIENTE" || estado === "PARCIAL";
  return {
    // RN-42: solo se edita lo que todavía no tiene entregas.
    editar: estado === "PENDIENTE",
    // RN-43: se anula lo que tiene algo por entregar; lo entregado se conserva.
    anular: porAtender,
    distribuir: porAtender,
  };
}

/** Detalle de un pedido con líneas, datos de anulación, distribuciones y acciones (FR-014), o null. */
export async function obtenerPedido(id: number) {
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      representante: { select: { id: true, nombre: true, apellido: true, servicio: true, activo: true, centroSalud: { select: { nombre: true } } } },
      usuario: { select: { nombre: true, apellido: true } },
      anuladaPor: { select: { nombre: true, apellido: true } },
      distribuciones: { orderBy: { id: "asc" }, select: { id: true, nroVale: true, fecha: true, estado: true } },
      lineas: {
        orderBy: { id: "asc" },
        include: { producto: { select: { id: true, codigo: true, nombre: true, activo: true, unidadMedida: { select: { abreviatura: true } } } } },
      },
    },
  });
  if (!pedido) return null;

  return {
    id: pedido.id,
    fecha: textoDeFechaDocumento(pedido.fecha),
    observacion: pedido.observacion,
    estado: pedido.estado,
    representante: {
      id: pedido.representante.id,
      nombre: pedido.representante.nombre,
      apellido: pedido.representante.apellido,
      servicio: pedido.representante.servicio,
      activo: pedido.representante.activo,
      centroSalud: pedido.representante.centroSalud.nombre,
    },
    registradoPor: `${pedido.usuario.nombre} ${pedido.usuario.apellido}`,
    registradoEn: pedido.creadoEn,
    motivoAnulacion: pedido.motivoAnulacion,
    anuladoPor: pedido.anuladaPor ? `${pedido.anuladaPor.nombre} ${pedido.anuladaPor.apellido}` : null,
    anuladoEn: pedido.anuladaEn,
    acciones: accionesSegunEstado(pedido.estado),
    distribuciones: pedido.distribuciones.map((distribucion) => ({
      id: distribucion.id,
      nroVale: distribucion.nroVale,
      fecha: textoDeFechaDocumento(distribucion.fecha),
      estado: distribucion.estado,
    })),
    lineas: pedido.lineas.map((linea) => ({
      id: linea.id,
      productoId: linea.producto.id,
      codigo: linea.producto.codigo,
      nombre: linea.producto.nombre,
      productoActivo: linea.producto.activo,
      unidad: linea.producto.unidadMedida.abreviatura,
      solicitada: linea.cantidadSolicitada,
      entregada: linea.cantidadEntregada,
      // Lo que falta entregar de la línea: se calcula al mostrar, no se guarda (data-model §2).
      pendiente: linea.cantidadSolicitada - linea.cantidadEntregada,
      // FR-011: al anular, lo que faltaba entregar queda como saldo anulado; las cantidades no cambian.
      saldoAnulado: pedido.estado === "ANULADO" ? linea.cantidadSolicitada - linea.cantidadEntregada : null,
    })),
  };
}

/** Estados de cada opción del filtro: "por atender" son los que todavía tienen algo por entregar. */
const ESTADOS_DEL_FILTRO: Record<EstadoFiltroPedidos, EstadoPedido[] | undefined> = {
  "por-atender": ["PENDIENTE", "PARCIAL"],
  pendientes: ["PENDIENTE"],
  parciales: ["PARCIAL"],
  atendidos: ["ATENDIDO"],
  anulados: ["ANULADO"],
  todos: undefined,
};

/**
 * Porcentaje atendido del pedido: unidades entregadas sobre solicitadas, redondeado hacia ABAJO. Así un
 * pedido con 199 de 200 muestra 99 % y nunca un 100 % engañoso cuando todavía falta algo (research P-07).
 */
function porcentajeAtendido(entregadas: number, solicitadas: number): number {
  return solicitadas === 0 ? 0 : Math.floor((entregadas * 100) / solicitadas);
}

/**
 * Listado de pedidos (FR-013, research P-07): filtros en la base por estado, representante y rango de
 * fechas; del más antiguo al más reciente, para atender primero lo que más espera.
 */
export async function listarPedidos(filtro: {
  estado: EstadoFiltroPedidos;
  representanteId?: number;
  desde?: string;
  hasta?: string;
  pagina: number;
}) {
  const estados = ESTADOS_DEL_FILTRO[filtro.estado];
  const where: Prisma.PedidoWhereInput = {
    estado: estados ? { in: estados } : undefined,
    representanteId: filtro.representanteId,
    fecha: {
      gte: filtro.desde ? aFechaDocumento(filtro.desde) : undefined,
      lte: filtro.hasta ? aFechaDocumento(filtro.hasta) : undefined,
    },
  };

  const [pedidos, total] = await Promise.all([
    prisma.pedido.findMany({
      where,
      orderBy: [{ fecha: "asc" }, { id: "asc" }],
      skip: (filtro.pagina - 1) * PEDIDOS_POR_PAGINA,
      take: PEDIDOS_POR_PAGINA,
      include: {
        representante: { select: { nombre: true, apellido: true, servicio: true } },
        _count: { select: { lineas: true } },
      },
    }),
    prisma.pedido.count({ where }),
  ]);

  // Sumas de solicitado y entregado solo de los pedidos de esta página, en una consulta.
  const sumas = await prisma.pedidoDetalle.groupBy({
    by: ["pedidoId"],
    where: { pedidoId: { in: pedidos.map((pedido) => pedido.id) } },
    _sum: { cantidadSolicitada: true, cantidadEntregada: true },
  });
  const sumaPorPedido = new Map(sumas.map((suma) => [suma.pedidoId, suma._sum]));

  return {
    total,
    pedidos: pedidos.map((pedido) => {
      const suma = sumaPorPedido.get(pedido.id);
      return {
        id: pedido.id,
        fecha: textoDeFechaDocumento(pedido.fecha),
        representante: `${pedido.representante.apellido}, ${pedido.representante.nombre}`,
        representanteId: pedido.representanteId,
        servicio: pedido.representante.servicio,
        productos: pedido._count.lineas,
        porcentajeAtendido: porcentajeAtendido(suma?.cantidadEntregada ?? 0, suma?.cantidadSolicitada ?? 0),
        estado: pedido.estado,
      };
    }),
  };
}
