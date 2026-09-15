// Operaciones simultáneas con distribuciones (FR-006, SC-002, SC-004, casos borde; research V-01 y V-12).
// Cada llamada abre su propia transacción: lo que se prueba es el bloqueo del pedido y de los productos.
import { beforeEach, describe, expect, it } from "vitest";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { registrarCompra } from "@/servicios/compras";
import { registrarDistribucion } from "@/servicios/distribuciones";
import { verificarConsistenciaInventario } from "@/servicios/inventario";
import { anularPedido, calcularEstadoPedido, editarPedido, registrarPedido } from "@/servicios/pedidos";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { crearRepresentanteDePrueba } from "../ayudantes/catalogos";
import { datosDistribucion, prepararPedidoConStock } from "../ayudantes/distribuciones";

function rechazo(resultados: PromiseSettledResult<unknown>[]) {
  expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const rechazado = resultados.find((r) => r.status === "rejected") as PromiseRejectedResult;
  expect(rechazado.reason).toBeInstanceOf(ErrorDeNegocio);
  return rechazado.reason as ErrorDeNegocio;
}

async function stockDe(productoId: number) {
  return (await prisma.producto.findUniqueOrThrow({ where: { id: productoId } })).stockActual;
}

async function consistente() {
  expect((await verificarConsistenciaInventario()).diferencias).toEqual([]);
}

describe("distribuciones simultáneas", () => {
  beforeEach(vaciarTablas);

  it("dos pedidos distintos que juntos superan el stock: se guarda una y el stock nunca queda negativo (FR-006, SC-002)", async () => {
    const primero = await prepararPedidoConStock({ lineas: [{ solicitada: 4, stock: 6, nombre: "Lavandina 1 L" }] });
    const producto = primero.productos[0]!;
    const representante = await crearRepresentanteDePrueba();
    const { id: segundoId } = await registrarPedido(
      { representanteId: representante.id, fecha: "2026-09-01", observacion: undefined, lineas: [{ productoId: producto.id, cantidadSolicitada: 4 }] },
      primero.usuario.id,
    );
    const segundo = await prisma.pedido.findUniqueOrThrow({ where: { id: segundoId }, include: { lineas: { select: { id: true } } } });

    const error = rechazo(
      await Promise.allSettled([
        registrarDistribucion(datosDistribucion(primero.pedido, [4], { nroVale: "1" }), primero.usuario.id),
        registrarDistribucion(datosDistribucion(segundo, [4], { nroVale: "2" }), primero.usuario.id),
      ]),
    );

    expect(error.message).toBe("Lavandina 1 L: puedes entregar como máximo 2 (pendiente 4, stock 2)");
    expect(await stockDe(producto.id)).toBe(2);
    expect(await prisma.distribucion.count()).toBe(1);
    await consistente();
  });

  it("dos distribuciones del mismo pedido que juntas superan lo pendiente: se guarda una con el pendiente nuevo", async () => {
    const { usuario, productos, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 5, stock: 20, nombre: "Jabón líquido" }] });

    const error = rechazo(
      await Promise.allSettled([
        registrarDistribucion(datosDistribucion(pedido, [3], { nroVale: "1" }), usuario.id),
        registrarDistribucion(datosDistribucion(pedido, [3], { nroVale: "2" }), usuario.id),
      ]),
    );

    expect(error.message).toBe("Jabón líquido: puedes entregar como máximo 2 (pendiente 2, stock 17)");
    expect(await stockDe(productos[0]!.id)).toBe(17);
    expect((await prisma.pedidoDetalle.findFirstOrThrow({ where: { pedidoId: pedido.id } })).cantidadEntregada).toBe(3);
    await consistente();
  });

  it("dos distribuciones con el mismo vale: se guarda una y la otra no toca stock ni pedido (SC-004)", async () => {
    const uno = await prepararPedidoConStock({ lineas: [{ solicitada: 5, stock: 5 }] });
    const otro = await prepararPedidoConStock({ lineas: [{ solicitada: 5, stock: 5 }] });

    const resultados = await Promise.allSettled([
      registrarDistribucion(datosDistribucion(uno.pedido, [2], { nroVale: "700" }), uno.usuario.id),
      registrarDistribucion(datosDistribucion(otro.pedido, [3], { nroVale: "700" }), otro.usuario.id),
    ]);

    const error = rechazo(resultados);
    expect(error.message).toBe("El vale 700 ya está registrado");
    const [primero] = resultados;
    // Solo el pedido cuya distribución se guardó tiene entregas y movimientos.
    const ganador = primero.status === "fulfilled" ? uno : otro;
    const perdedor = primero.status === "fulfilled" ? otro : uno;
    expect(await stockDe(perdedor.productos[0]!.id)).toBe(5);
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: perdedor.pedido.id } })).estado).toBe("PENDIENTE");
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: ganador.pedido.id } })).estado).toBe("PARCIAL");
    expect(await prisma.distribucion.count()).toBe(1);
    await consistente();
  });

  it("distribución que completa el pedido contra su anulación: gana una sola (caso borde)", async () => {
    const { usuario, productos, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 5, stock: 5 }] });

    const [distribucion, anulacion] = await Promise.allSettled([
      registrarDistribucion(datosDistribucion(pedido, [5]), usuario.id),
      anularPedido(pedido.id, "Ya no lo necesitan", usuario.id),
    ]);

    const final = await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id } });
    if (distribucion.status === "fulfilled") {
      expect(anulacion.status).toBe("rejected");
      expect((anulacion as PromiseRejectedResult).reason.message).toBe("El pedido ya está atendido y no se puede anular");
      expect(final.estado).toBe("ATENDIDO");
      expect(await stockDe(productos[0]!.id)).toBe(0);
    } else {
      expect(anulacion.status).toBe("fulfilled");
      expect((distribucion as PromiseRejectedResult).reason.message).toBe("El pedido está anulado: no se puede distribuir");
      expect(final.estado).toBe("ANULADO");
      expect(await stockDe(productos[0]!.id)).toBe(5);
    }
    await consistente();
  });

  it("edición del pedido contra una distribución real: gana una y el estado coincide con las cantidades (caso borde)", async () => {
    const { usuario, representante, productos, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 10, stock: 20 }] });

    const [edicion, distribucion] = await Promise.allSettled([
      editarPedido(pedido.id, { representanteId: representante.id, fecha: "2026-09-01", observacion: undefined, lineas: [{ productoId: productos[0]!.id, cantidadSolicitada: 12 }] }),
      registrarDistribucion(datosDistribucion(pedido, [3]), usuario.id),
    ]);

    expect(distribucion.status).toBe("fulfilled");
    const final = await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id }, include: { lineas: true } });
    if (edicion.status === "rejected") {
      expect((edicion.reason as ErrorDeNegocio).message).toBe("El pedido ya tiene entregas y no se puede editar");
      expect(final.lineas[0]!.cantidadSolicitada).toBe(10);
    } else {
      expect(final.lineas[0]!.cantidadSolicitada).toBe(12);
    }
    expect(final.lineas[0]!.cantidadEntregada).toBe(3);
    expect(final.estado).toBe(calcularEstadoPedido(final.lineas));
    await consistente();
  });

  it("una compra y una distribución simultáneas del mismo producto no se bloquean entre sí", async () => {
    const { usuario, productos, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 5, stock: 5 }] });

    await Promise.all([
      registrarDistribucion(datosDistribucion(pedido, [5]), usuario.id),
      prisma.proveedor.findFirstOrThrow().then((proveedor) =>
        registrarCompra({ proveedorId: proveedor.id, nroFactura: "777", fecha: "2026-09-05", lineas: [{ productoId: productos[0]!.id, cantidad: 3, precioUnitario: "10" }] }, usuario.id),
      ),
    ]);

    expect(await stockDe(productos[0]!.id)).toBe(3);
    await consistente();
  });
});
