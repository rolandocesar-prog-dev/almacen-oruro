// Datos de prueba de consumo (F-007): series de consumo armadas con documentos reales.
// Nada se escribe a mano en el kardex: la compra y la distribución pasan por sus servicios (principio III).
import { prisma } from "@/lib/prisma";
import { registrarCompra } from "@/servicios/compras";
import { registrarDistribucion } from "@/servicios/distribuciones";
import { registrarPedido } from "@/servicios/pedidos";
import { crearProductoDePrueba, crearProveedorDePrueba, crearRepresentanteDePrueba } from "./catalogos";

let contador = 0;
function siguiente() {
  contador += 1;
  return contador;
}

/** Producto activo con el stock indicado, cargado con una compra real. */
export async function productoConStock(
  usuarioId: number,
  stock: number,
  opciones: { fechaCompra?: string; stockMinimo?: number; categoriaId?: number; nombre?: string; precio?: string } = {},
) {
  const producto = await crearProductoDePrueba({
    stockMinimo: opciones.stockMinimo ?? 0,
    ...(opciones.categoriaId ? { categoriaId: opciones.categoriaId } : {}),
    ...(opciones.nombre ? { nombre: opciones.nombre } : {}),
  });
  if (stock > 0) {
    const proveedor = await crearProveedorDePrueba();
    await registrarCompra(
      {
        proveedorId: proveedor.id,
        nroFactura: String(800000 + siguiente()),
        fecha: opciones.fechaCompra ?? "2026-01-05",
        observacion: undefined,
        lineas: [{ productoId: producto.id, cantidad: stock, precioUnitario: opciones.precio ?? "10" }],
      },
      usuarioId,
    );
  }
  return producto;
}

/** Entrega `cantidad` unidades del producto con un pedido y una distribución reales, fechados ese día. */
export async function distribuir(
  usuarioId: number,
  productoId: number,
  cantidad: number,
  fecha: string,
  representanteId?: number,
): Promise<number> {
  const representante = representanteId ?? (await crearRepresentanteDePrueba()).id;
  const { id: pedidoId } = await registrarPedido(
    { representanteId: representante, fecha, observacion: undefined, lineas: [{ productoId, cantidadSolicitada: cantidad }] },
    usuarioId,
  );
  const linea = await prisma.pedidoDetalle.findFirstOrThrow({ where: { pedidoId }, select: { id: true } });
  const { id } = await registrarDistribucion(
    { pedidoId, nroVale: String(50000 + siguiente()), fecha, observacion: undefined, lineas: [{ pedidoDetalleId: linea.id, cantidad }] },
    usuarioId,
  );
  return id;
}

/**
 * Serie mensual completa: una distribución por mes con la cantidad indicada, desde `primerMes`. Un 0
 * deja el mes sin movimientos. El producto recibe stock de sobra para todas las entregas.
 */
export async function productoConSerie(
  usuarioId: number,
  primerMes: string,
  consumos: number[],
  opciones: { stockFinal?: number; stockMinimo?: number; categoriaId?: number } = {},
) {
  const total = consumos.reduce((suma, valor) => suma + valor, 0);
  const producto = await productoConStock(usuarioId, total + (opciones.stockFinal ?? 0), {
    fechaCompra: `${primerMes}-01`,
    stockMinimo: opciones.stockMinimo,
    categoriaId: opciones.categoriaId,
  });
  const representante = await crearRepresentanteDePrueba();

  let [anio, mes] = primerMes.split("-").map(Number) as [number, number];
  for (const consumo of consumos) {
    if (consumo > 0) {
      await distribuir(usuarioId, producto.id, consumo, `${anio}-${String(mes).padStart(2, "0")}-10`, representante.id);
    }
    mes += 1;
    if (mes === 13) {
      mes = 1;
      anio += 1;
    }
  }
  return producto;
}
