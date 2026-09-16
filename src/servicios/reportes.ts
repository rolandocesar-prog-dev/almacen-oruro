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
