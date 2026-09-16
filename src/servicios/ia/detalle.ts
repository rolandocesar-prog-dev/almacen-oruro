// Detalle de pronóstico de un producto, para su gráfico (F-007, Historia 7; FR-017, research A-12).
//
// Junta lo que ya calculan la serie, el pronóstico y la evaluación: no agrega ninguna cuenta nueva. Está
// en su propio archivo porque usa las dos piezas, y la evaluación ya depende del pronóstico.
import { prisma } from "@/lib/prisma";
import { evaluarProducto } from "./evaluacion";
import { mesPronosticado, pronosticarProducto, reposicionSugerida } from "./pronostico";
import { serieDeConsumo } from "./serie";

/** Serie, pronóstico del mes y —si el producto es evaluable— los pronósticos de validación de Holt-Winters. */
export async function detalleDePronostico(productoId: number, ahora: Date = new Date()) {
  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
    select: { id: true, codigo: true, nombre: true, activo: true, stockActual: true, stockMinimo: true, unidadMedida: { select: { nombre: true } } },
  });
  if (!producto) return null;

  const serie = await serieDeConsumo(productoId, ahora);
  const pronostico = pronosticarProducto(serie);
  const evaluacion = evaluarProducto(serie);
  const validacion = evaluacion.evaluable
    ? evaluacion.validacion.map((mes, indice) => ({
        mes: mes.mes,
        real: mes.real,
        pronostico: evaluacion.porMetodo.find((r) => r.metodo === "holt-winters")?.pronosticos[indice] ?? 0,
      }))
    : [];

  return {
    producto: {
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      unidad: producto.unidadMedida.nombre,
      activo: producto.activo,
      stockActual: producto.stockActual,
      stockMinimo: producto.stockMinimo,
    },
    serie,
    mesPronosticado: mesPronosticado(ahora),
    ...pronostico,
    reposicionSugerida: reposicionSugerida(pronostico.pronostico, producto.stockMinimo, producto.stockActual),
    validacion,
  };
}

export type DetalleDePronostico = NonNullable<Awaited<ReturnType<typeof detalleDePronostico>>>;
