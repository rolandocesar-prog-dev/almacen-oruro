// Datos de prueba de distribuciones (F-005, tarea T004).
// Preparan pedido y stock con los servicios reales (registrarCompra, registrarPedido): ninguna prueba
// escribe el stock a mano (principio III).
import type { DatosDistribucion } from "@/esquemas/distribuciones";
import { prisma } from "@/lib/prisma";
import { registrarCompra } from "@/servicios/compras";
import { registrarPedido } from "@/servicios/pedidos";
import { crearUsuarioDePrueba } from "./base-de-datos";
import { crearProductoDePrueba, crearProveedorDePrueba, crearRepresentanteDePrueba } from "./catalogos";

let contador = 0;
function siguiente() {
  contador += 1;
  return contador;
}

type LineaPreparada = { solicitada: number; stock: number; nombre?: string; activo?: boolean };

/**
 * Pedido PENDIENTE con una línea por producto y el stock indicado, dejado con UNA compra real. Si una
 * línea lleva `activo: false`, su producto se desactiva después de registrar el pedido (caso borde de un
 * pedido por atender con valores inactivos, I-23).
 */
export async function prepararPedidoConStock({ lineas, fechaPedido = "2026-09-01" }: { lineas: LineaPreparada[]; fechaPedido?: string }) {
  const { usuario } = await crearUsuarioDePrueba();
  const representante = await crearRepresentanteDePrueba();
  const productos: Awaited<ReturnType<typeof crearProductoDePrueba>>[] = [];
  for (const linea of lineas) productos.push(await crearProductoDePrueba(linea.nombre ? { nombre: linea.nombre } : {}));

  const conStock = lineas.flatMap((linea, i) => (linea.stock > 0 ? [{ productoId: productos[i]!.id, cantidad: linea.stock, precioUnitario: "10" }] : []));
  if (conStock.length > 0) {
    const proveedor = await crearProveedorDePrueba();
    await registrarCompra({ proveedorId: proveedor.id, nroFactura: String(600000 + siguiente()), fecha: "2026-09-01", lineas: conStock }, usuario.id);
  }

  const { id } = await registrarPedido(
    {
      representanteId: representante.id,
      fecha: fechaPedido,
      observacion: undefined,
      lineas: lineas.map((linea, i) => ({ productoId: productos[i]!.id, cantidadSolicitada: linea.solicitada })),
    },
    usuario.id,
  );

  for (const [i, linea] of lineas.entries()) {
    if (linea.activo === false) await prisma.producto.update({ where: { id: productos[i]!.id }, data: { activo: false } });
  }

  const pedido = await prisma.pedido.findUniqueOrThrow({
    where: { id },
    include: { lineas: { orderBy: { id: "asc" }, select: { id: true, productoId: true } } },
  });
  return { usuario, representante, productos, pedido };
}

/** Datos de una distribución con una entrada por línea del pedido, en su orden (research V-02). */
export function datosDistribucion(
  pedido: { id: number; lineas: { id: number }[] },
  cantidades: (number | "")[],
  cambios: Partial<Omit<DatosDistribucion, "lineas">> = {},
): DatosDistribucion {
  return {
    pedidoId: pedido.id,
    nroVale: "500",
    fecha: "2026-09-10",
    observacion: undefined,
    lineas: pedido.lineas.map((linea, i) => ({ pedidoDetalleId: linea.id, cantidad: cantidades[i] === "" ? undefined : cantidades[i] })),
    ...cambios,
  };
}
