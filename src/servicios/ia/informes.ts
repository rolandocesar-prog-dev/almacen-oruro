// Informes IA de compras y de distribuciones (F-007, research A-09 a A-11; FR-010 a FR-016).
//
// El sistema calcula los datos del período, el modelo los redacta y el informe se guarda con esos mismos
// datos: lo que se envía, lo que se guarda y lo que se muestra junto al texto es un único objeto, así
// cada cifra del texto se puede verificar contra la tabla (SC-007).
//
// Los datos se arman **campo por campo**: nunca se serializa una entidad de Prisma, para que no pueda
// colarse un teléfono, una dirección, un correo, un CI ni una contraseña (FR-012, research A-10).
import type { TipoInforme } from "@/generado/prisma/client";
import { esquemaSeccionesInforme, type TipoDeInforme } from "@/esquemas/ia";
import { ErrorDeNegocio } from "@/lib/errores";
import { aFechaDocumento, textoDeFechaDocumento } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import { compararEnEspanol } from "@/lib/texto";
import { reporteDistribuciones, reporteExistencias, reportePedidos } from "@/servicios/reportes";
import { pronosticoDeProductos } from "./pronostico";
import { ErrorDeRedaccion, MODELO_IA, motivoDeError, type MotivoDeFalla, redactorAnthropic, type Redactor } from "./redactor";
import { textoDeSecciones } from "./texto-informe";

/** Mensajes de los rechazos (data-model §4, FR-015). En ningún caso se guarda nada. */
export const MENSAJES_INFORME = {
  sinDatos: "No hay datos suficientes para ese período: no se generó el informe",
  "sin-conexion":
    "No se pudo generar el informe: sin conexión con el servicio de redacción. Puedes consultar los informes ya generados",
  demora: "El servicio de redacción tardó demasiado: el informe no se generó",
  formato: "La respuesta del servicio no tuvo el formato esperado: el informe no se generó",
} as const satisfies Record<MotivoDeFalla | "sinDatos", string>;

/** Cuántas filas entran en los "principales" de cada informe (FR-011). */
const PRINCIPALES = 10;

export type Periodo = { desde: string; hasta: string };

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Período anterior de igual duración: si el informe es del 01/08 al 31/08 (31 días), el anterior va del
 * 01/07 al 31/07. Sirve para decir si algo subió o bajó (FR-011).
 */
export function periodoAnterior({ desde, hasta }: Periodo): Periodo {
  const inicio = aFechaDocumento(desde).getTime();
  const dias = Math.round((aFechaDocumento(hasta).getTime() - inicio) / MS_POR_DIA) + 1;
  const hastaAnterior = new Date(inicio - MS_POR_DIA);
  const desdeAnterior = new Date(hastaAnterior.getTime() - (dias - 1) * MS_POR_DIA);
  return { desde: textoDeFechaDocumento(desdeAnterior), hasta: textoDeFechaDocumento(hastaAnterior) };
}

/**
 * Variación porcentual contra el período anterior, con un decimal. Sin nada en el anterior no hay contra
 * qué comparar: `null`, y el modelo tiene instrucción de decirlo así.
 */
export function variacionPorcentual(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 1000) / 10;
}

function entre({ desde, hasta }: Periodo) {
  return { gte: aFechaDocumento(desde), lte: aFechaDocumento(hasta) };
}

function bloquePeriodo(periodo: Periodo) {
  const anterior = periodoAnterior(periodo);
  return { desde: periodo.desde, hasta: periodo.hasta, anteriorDesde: anterior.desde, anteriorHasta: anterior.hasta };
}

/** Gasto y cantidad de compras vigentes de un período. */
async function totalesDeCompras(periodo: Periodo) {
  const resultado = await prisma.compra.aggregate({
    _sum: { total: true },
    _count: true,
    where: { fecha: entre(periodo), estado: "REGISTRADA" },
  });
  return { totalGastado: resultado._sum.total?.toFixed(2) ?? "0.00", compras: resultado._count };
}

/** Productos bajo mínimo y reposición sugerida: el estado del almacén al generar el informe. */
async function situacionDelAlmacen() {
  const [existencias, pronostico] = await Promise.all([
    reporteExistencias({ soloBajoMinimo: true }),
    pronosticoDeProductos({ soloConReposicion: true }),
  ]);
  return {
    bajoMinimo: existencias.grupos
      .flatMap((grupo) => grupo.filas)
      .map((fila) => ({ codigo: fila.codigo, producto: fila.nombre, stockActual: fila.stockActual, stockMinimo: fila.stockMinimo })),
    reposicion: pronostico.filas.map((fila) => ({
      codigo: fila.codigo,
      producto: fila.nombre,
      pronostico: fila.pronostico,
      reposicionSugerida: fila.reposicionSugerida,
    })),
  };
}

/**
 * Datos del Informe IA de compras (FR-011). Devuelve `null` si el período no tiene compras vigentes:
 * no hay nada que redactar (FR-015).
 */
export async function datosInformeCompras(periodo: Periodo) {
  const anterior = periodoAnterior(periodo);
  const [actuales, previos] = await Promise.all([totalesDeCompras(periodo), totalesDeCompras(anterior)]);
  if (actuales.compras === 0) return null;

  const [porProveedorAgrupado, porProductoAgrupado, situacion] = await Promise.all([
    prisma.compra.groupBy({
      by: ["proveedorId"],
      _sum: { total: true },
      _count: true,
      where: { fecha: entre(periodo), estado: "REGISTRADA" },
    }),
    prisma.compraDetalle.groupBy({
      by: ["productoId"],
      _sum: { cantidad: true, subtotal: true },
      where: { compra: { fecha: entre(periodo), estado: "REGISTRADA" } },
    }),
    situacionDelAlmacen(),
  ]);

  const [proveedores, productos] = await Promise.all([
    prisma.proveedor.findMany({
      where: { id: { in: porProveedorAgrupado.map((fila) => fila.proveedorId) } },
      select: { id: true, razonSocial: true },
    }),
    prisma.producto.findMany({
      where: { id: { in: porProductoAgrupado.map((fila) => fila.productoId) } },
      select: { id: true, codigo: true, nombre: true },
    }),
  ]);
  const nombreProveedor = new Map(proveedores.map((proveedor) => [proveedor.id, proveedor.razonSocial]));
  const productoPorId = new Map(productos.map((producto) => [producto.id, producto]));

  return {
    periodo: bloquePeriodo(periodo),
    totales: {
      totalGastado: actuales.totalGastado,
      compras: actuales.compras,
      totalGastadoAnterior: previos.totalGastado,
      comprasAnterior: previos.compras,
      variacionGastoPorcentual: variacionPorcentual(Number(actuales.totalGastado), Number(previos.totalGastado)),
      variacionComprasPorcentual: variacionPorcentual(actuales.compras, previos.compras),
    },
    porProveedor: porProveedorAgrupado
      .map((fila) => ({
        proveedor: nombreProveedor.get(fila.proveedorId) ?? "",
        totalGastado: fila._sum.total?.toFixed(2) ?? "0.00",
        compras: fila._count,
      }))
      .sort((a, b) => Number(b.totalGastado) - Number(a.totalGastado) || compararEnEspanol(a.proveedor, b.proveedor)),
    topProductos: porProductoAgrupado
      .map((fila) => ({
        codigo: productoPorId.get(fila.productoId)?.codigo ?? "",
        producto: productoPorId.get(fila.productoId)?.nombre ?? "",
        unidades: fila._sum.cantidad ?? 0,
        totalGastado: fila._sum.subtotal?.toFixed(2) ?? "0.00",
      }))
      .sort((a, b) => Number(b.totalGastado) - Number(a.totalGastado) || compararEnEspanol(a.producto, b.producto))
      .slice(0, PRINCIPALES),
    ...situacion,
  };
}

/** Unidades entregadas en distribuciones vigentes de un período. */
async function unidadesEntregadas(periodo: Periodo): Promise<number> {
  const resultado = await prisma.distribucionDetalle.aggregate({
    _sum: { cantidad: true },
    where: { distribucion: { fecha: entre(periodo), estado: "REGISTRADA" } },
  });
  return resultado._sum.cantidad ?? 0;
}

/**
 * Datos del Informe IA de distribuciones (FR-011). Devuelve `null` si el período no tiene distribuciones
 * vigentes (FR-015).
 */
export async function datosInformeDistribuciones(periodo: Periodo) {
  const vigentes = await prisma.distribucion.count({ where: { fecha: entre(periodo), estado: "REGISTRADA" } });
  if (vigentes === 0) return null;

  const [actuales, previas, lineas, distribuidos, pedidos, pronostico] = await Promise.all([
    unidadesEntregadas(periodo),
    unidadesEntregadas(periodoAnterior(periodo)),
    // Solo nombre, apellido y centro del representante: nunca su CI (A-10, F-009).
    prisma.distribucionDetalle.findMany({
      where: { distribucion: { fecha: entre(periodo), estado: "REGISTRADA" } },
      select: {
        cantidad: true,
        distribucion: {
          select: { pedido: { select: { representante: { select: { id: true, nombre: true, apellido: true, centroSalud: { select: { nombre: true } } } } } } },
        },
      },
    }),
    reporteDistribuciones({ ...periodo, incluirAnulados: false, pagina: 1 }),
    reportePedidos({ ...periodo, estado: "todos", incluirAnulados: true, pagina: 1 }),
    pronosticoDeProductos(),
  ]);

  const porRepresentante = new Map<number, { representante: string; centroSalud: string; unidades: number }>();
  for (const linea of lineas) {
    const { representante } = linea.distribucion.pedido;
    const acumulado = porRepresentante.get(representante.id) ?? {
      representante: `${representante.apellido}, ${representante.nombre}`,
      centroSalud: representante.centroSalud.nombre,
      unidades: 0,
    };
    acumulado.unidades += linea.cantidad;
    porRepresentante.set(representante.id, acumulado);
  }

  const topProductos = [...distribuidos.totales.porProducto]
    .sort((a, b) => b.cantidad - a.cantidad || compararEnEspanol(a.nombre, b.nombre))
    .slice(0, PRINCIPALES)
    .map((fila) => ({ codigo: fila.codigo, producto: fila.nombre, unidad: fila.unidad, unidades: fila.cantidad }));
  const pronosticoPorCodigo = new Map(pronostico.filas.map((fila) => [fila.codigo, fila]));

  return {
    periodo: bloquePeriodo(periodo),
    totales: {
      unidadesEntregadas: actuales,
      unidadesEntregadasAnterior: previas,
      variacionPorcentual: variacionPorcentual(actuales, previas),
    },
    porRepresentante: [...porRepresentante.values()].sort(
      (a, b) => b.unidades - a.unidades || compararEnEspanol(a.representante, b.representante),
    ),
    topProductos,
    pedidosPorEstado: pedidos.totales.porEstado,
    // Pronóstico del mes en curso de los productos más distribuidos que siguen activos.
    pronostico: topProductos.flatMap((fila) => {
      const pronosticado = pronosticoPorCodigo.get(fila.codigo);
      return pronosticado
        ? [{ codigo: fila.codigo, producto: fila.producto, mes: pronosticado.mesPronosticado, pronostico: pronosticado.pronostico }]
        : [];
    }),
  };
}

export type DatosInformeCompras = NonNullable<Awaited<ReturnType<typeof datosInformeCompras>>>;
export type DatosInformeDistribuciones = NonNullable<Awaited<ReturnType<typeof datosInformeDistribuciones>>>;

/**
 * Genera y guarda un informe (FR-010 a FR-015): calcula los datos → rechaza si el período está vacío →
 * pide la redacción → valida las cuatro secciones → guarda. Si algo falla, no se guarda nada y el error
 * lleva el mensaje que ve el usuario.
 */
export async function generarInforme(
  tipo: TipoDeInforme,
  periodo: Periodo,
  usuarioId: number,
  redactor: Redactor = redactorAnthropic,
): Promise<{ id: number }> {
  const datos = tipo === "COMPRAS" ? await datosInformeCompras(periodo) : await datosInformeDistribuciones(periodo);
  // Sin documentos no se llama al modelo: no tendría nada verdadero que decir.
  if (!datos) throw new ErrorDeNegocio(MENSAJES_INFORME.sinDatos);

  let respuesta: unknown;
  try {
    respuesta = await redactor({ tipo, datos });
  } catch (error) {
    throw new ErrorDeNegocio(MENSAJES_INFORME[error instanceof ErrorDeRedaccion ? error.motivo : motivoDeError(error)]);
  }

  // Se valida también aquí: el redactor es una pieza intercambiable y su respuesta es una entrada externa.
  const secciones = esquemaSeccionesInforme.safeParse(respuesta);
  if (!secciones.success) throw new ErrorDeNegocio(MENSAJES_INFORME.formato);

  const informe = await prisma.informeIa.create({
    data: {
      tipo: tipo satisfies TipoInforme,
      desde: aFechaDocumento(periodo.desde),
      hasta: aFechaDocumento(periodo.hasta),
      datosEntrada: datos,
      texto: textoDeSecciones(secciones.data),
      modelo: MODELO_IA,
      usuarioId,
    },
    select: { id: true },
  });
  return informe;
}

const USUARIO_DEL_INFORME = { select: { nombre: true, apellido: true } } as const;

/**
 * Informes guardados, del más reciente al más antiguo (FR-016). Solo lee la base: funciona sin internet
 * (SC-008).
 */
export async function listarInformes({ tipo }: { tipo: "todos" | TipoDeInforme }) {
  const informes = await prisma.informeIa.findMany({
    where: { tipo: tipo === "todos" ? undefined : tipo },
    orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
    select: { id: true, tipo: true, desde: true, hasta: true, modelo: true, creadoEn: true, usuario: USUARIO_DEL_INFORME },
  });
  return {
    informes: informes.map((informe) => ({
      id: informe.id,
      tipo: informe.tipo,
      desde: textoDeFechaDocumento(informe.desde),
      hasta: textoDeFechaDocumento(informe.hasta),
      modelo: informe.modelo,
      creadoEn: informe.creadoEn,
      usuario: `${informe.usuario.nombre} ${informe.usuario.apellido}`,
    })),
  };
}

/** Un informe con su texto y los datos con que se redactó (FR-013, FR-016); `null` si no existe. */
export async function obtenerInforme(id: number) {
  const informe = await prisma.informeIa.findUnique({
    where: { id },
    select: {
      id: true,
      tipo: true,
      desde: true,
      hasta: true,
      datosEntrada: true,
      texto: true,
      modelo: true,
      creadoEn: true,
      usuario: USUARIO_DEL_INFORME,
    },
  });
  if (!informe) return null;
  return {
    id: informe.id,
    tipo: informe.tipo,
    desde: textoDeFechaDocumento(informe.desde),
    hasta: textoDeFechaDocumento(informe.hasta),
    datosEntrada: informe.datosEntrada,
    texto: informe.texto,
    modelo: informe.modelo,
    creadoEn: informe.creadoEn,
    usuario: `${informe.usuario.nombre} ${informe.usuario.apellido}`,
  };
}

export type InformeGuardado = NonNullable<Awaited<ReturnType<typeof obtenerInforme>>>;
