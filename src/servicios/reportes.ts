// Reportes (F-006). Cinco consultas de SOLO LECTURA sobre los datos de F-001 a F-005: este módulo no
// llama a create, update ni delete, y no importa registrarMovimiento (FR-005; lo verifica una prueba que
// lee este archivo).
//
// Dos reglas valen para todos:
// - Las fechas filtran por la FECHA DEL DOCUMENTO, no por el momento de registro (RN-53).
// - Los totales cuentan SOLO los documentos vigentes, aunque el listado incluya los anulados (FR-003), y
//   se calculan sobre todo el rango con agregados de la base, no sobre las filas mostradas (research E-02).
import type { Prisma } from "@/generado/prisma/client";
import { aFechaDocumento, textoDeFechaDocumento } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import { compararEnEspanol } from "@/lib/texto";
import { listarExistencias } from "./inventario";

/** En pantalla el reporte se pagina; la vista de impresión pide todas las filas (research E-04). */
export const FILAS_POR_PAGINA_REPORTE = 100;

type Rango = { desde: string; hasta: string };
type Paginado = { pagina?: number; todas?: boolean };

/** Rango de fechas de documento para el `where` de Prisma. */
function entreFechas({ desde, hasta }: Rango) {
  return { gte: aFechaDocumento(desde), lte: aFechaDocumento(hasta) };
}

/** `skip`/`take` de la página, o nada cuando el reporte se imprime completo. */
function recorte({ pagina = 1, todas = false }: Paginado): { skip?: number; take?: number } {
  return todas ? {} : { skip: (pagina - 1) * FILAS_POR_PAGINA_REPORTE, take: FILAS_POR_PAGINA_REPORTE };
}

/**
 * R-1 · Compras del período (FR-009). Filas ordenadas del más antiguo al más reciente, como se lee una
 * hoja impresa; totales del rango completo y solo de las compras REGISTRADAS (SC-001).
 */
export async function reporteCompras(filtro: Rango & Paginado & { proveedorId?: number; incluirAnulados: boolean }) {
  const where: Prisma.CompraWhereInput = {
    fecha: entreFechas(filtro),
    proveedorId: filtro.proveedorId,
    estado: filtro.incluirAnulados ? undefined : "REGISTRADA",
  };

  const [compras, total, vigentes] = await Promise.all([
    prisma.compra.findMany({
      where,
      orderBy: [{ fecha: "asc" }, { id: "asc" }],
      ...recorte(filtro),
      include: { proveedor: { select: { razonSocial: true } }, _count: { select: { lineas: true } } },
    }),
    prisma.compra.count({ where }),
    prisma.compra.aggregate({
      _sum: { total: true },
      _count: true,
      where: { fecha: entreFechas(filtro), proveedorId: filtro.proveedorId, estado: "REGISTRADA" },
    }),
  ]);

  return {
    total,
    filas: compras.map((compra) => ({
      id: compra.id,
      fecha: textoDeFechaDocumento(compra.fecha),
      nroFactura: compra.nroFactura,
      proveedor: compra.proveedor.razonSocial,
      items: compra._count.lineas,
      total: compra.total.toFixed(2),
      estado: compra.estado,
    })),
    // Sin compras en el rango, Prisma devuelve null en la suma: el total del reporte vale 0.
    totales: { totalGastado: vigentes._sum.total?.toFixed(2) ?? "0.00", compras: vigentes._count },
  };
}

/**
 * R-2 · Distribuciones del período (FR-010): una fila por **línea entregada**, con el representante tomado
 * del pedido (X-08). El total por producto suma solo las líneas de distribuciones REGISTRADAS (SC-003).
 */
export async function reporteDistribuciones(
  filtro: Rango & Paginado & { representanteId?: number; productoId?: number; incluirAnulados: boolean },
) {
  const where: Prisma.DistribucionDetalleWhereInput = {
    distribucion: {
      fecha: entreFechas(filtro),
      estado: filtro.incluirAnulados ? undefined : "REGISTRADA",
      pedido: filtro.representanteId ? { representanteId: filtro.representanteId } : undefined,
    },
    pedidoDetalle: filtro.productoId ? { productoId: filtro.productoId } : undefined,
  };

  const [lineas, total, sumas] = await Promise.all([
    prisma.distribucionDetalle.findMany({
      where,
      orderBy: [{ distribucion: { fecha: "asc" } }, { distribucionId: "asc" }, { id: "asc" }],
      ...recorte(filtro),
      include: {
        distribucion: {
          select: {
            id: true,
            nroVale: true,
            fecha: true,
            estado: true,
            pedido: { select: { representante: { select: { nombre: true, apellido: true, servicio: true } } } },
          },
        },
        pedidoDetalle: {
          select: { producto: { select: { id: true, codigo: true, nombre: true, unidadMedida: { select: { abreviatura: true } } } } },
        },
      },
    }),
    prisma.distribucionDetalle.count({ where }),
    // El total se agrupa en la base por línea de pedido: son decenas, no las miles de líneas entregadas de
    // un año (research E-02). Después se suman por producto.
    prisma.distribucionDetalle.groupBy({
      by: ["pedidoDetalleId"],
      _sum: { cantidad: true },
      where: {
        distribucion: {
          fecha: entreFechas(filtro),
          estado: "REGISTRADA",
          pedido: filtro.representanteId ? { representanteId: filtro.representanteId } : undefined,
        },
        pedidoDetalle: filtro.productoId ? { productoId: filtro.productoId } : undefined,
      },
    }),
  ]);

  const lineasDePedido = await prisma.pedidoDetalle.findMany({
    where: { id: { in: sumas.map((suma) => suma.pedidoDetalleId) } },
    select: { id: true, producto: { select: { id: true, codigo: true, nombre: true, unidadMedida: { select: { abreviatura: true } } } } },
  });
  const productoDeLinea = new Map(lineasDePedido.map((linea) => [linea.id, linea.producto]));

  const porProducto = new Map<number, { codigo: string; nombre: string; unidad: string; cantidad: number }>();
  for (const suma of sumas) {
    const producto = productoDeLinea.get(suma.pedidoDetalleId);
    if (!producto) continue;
    const acumulado = porProducto.get(producto.id) ?? {
      codigo: producto.codigo,
      nombre: producto.nombre,
      unidad: producto.unidadMedida.abreviatura,
      cantidad: 0,
    };
    acumulado.cantidad += suma._sum.cantidad ?? 0;
    porProducto.set(producto.id, acumulado);
  }

  return {
    total,
    filas: lineas.map((linea) => ({
      id: linea.id,
      distribucionId: linea.distribucion.id,
      fecha: textoDeFechaDocumento(linea.distribucion.fecha),
      nroVale: linea.distribucion.nroVale,
      representante: `${linea.distribucion.pedido.representante.apellido}, ${linea.distribucion.pedido.representante.nombre}`,
      servicio: linea.distribucion.pedido.representante.servicio,
      codigo: linea.pedidoDetalle.producto.codigo,
      producto: linea.pedidoDetalle.producto.nombre,
      unidad: linea.pedidoDetalle.producto.unidadMedida.abreviatura,
      cantidad: linea.cantidad,
      estado: linea.distribucion.estado,
    })),
    totales: { porProducto: [...porProducto.values()].sort((a, b) => compararEnEspanol(a.nombre, b.nombre)) },
  };
}

/**
 * R-3 · Existencias al momento de emitir el reporte (FR-011). Reutiliza `listarExistencias` de F-003 para
 * que sean exactamente los mismos productos e indicadores que la consulta en pantalla —incluidos los
 * inactivos que todavía tienen stock—, y los agrupa por categoría. No lleva rango de fechas: el pasado se
 * consulta con el kardex (Historia 3 · E4).
 */
export async function reporteExistencias(filtro: { categoriaId?: number; soloBajoMinimo: boolean }) {
  const { productos } = await listarExistencias({
    // "habituales": activos e inactivos con stock, los mismos que muestra la consulta de F-003 (FR-011).
    estado: "habituales",
    categoriaId: filtro.categoriaId,
    soloBajoMinimo: filtro.soloBajoMinimo,
  });

  const filas = productos.map((producto) => ({
    id: producto.id,
    codigo: producto.codigo,
    nombre: producto.nombre,
    categoria: producto.categoria,
    unidad: producto.unidad,
    abreviatura: producto.abreviatura,
    stockActual: producto.stockActual,
    stockMinimo: producto.stockMinimo,
    // RN-52: solo un producto activo está "bajo mínimo"; los inactivos se marcan como tales.
    indicador: producto.bajoMinimo ? "Bajo mínimo" : producto.activo ? "—" : "Inactivo",
  }));

  const categorias = [...new Set(filas.map((fila) => fila.categoria))].sort(compararEnEspanol);
  return {
    grupos: categorias.map((categoria) => ({
      categoria,
      filas: filas.filter((fila) => fila.categoria === categoria).sort((a, b) => compararEnEspanol(a.nombre, b.nombre)),
    })),
    totales: { productos: filas.length, bajoMinimo: filas.filter((fila) => fila.indicador === "Bajo mínimo").length },
  };
}
