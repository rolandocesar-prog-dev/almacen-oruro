// Historia 5 · Anular un pedido o su saldo pendiente (FR-010 a FR-012, RN-43, SC-003, SC-006; research P-06).
import { beforeEach, describe, expect, it } from "vitest";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { anularPedido, listarPedidos, obtenerPedido } from "@/servicios/pedidos";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearMovimientoDePrueba, crearProductoDePrueba } from "../ayudantes/catalogos";
import { crearPedidoDePrueba, simularEntregaDePrueba } from "../ayudantes/pedidos";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

describe("anularPedido", () => {
  beforeEach(vaciarTablas);

  it("un PENDIENTE queda ANULADO con motivo, quién y cuándo, sin tocar el stock y fuera del listado por defecto (E1)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const producto = await crearProductoDePrueba();
    await crearMovimientoDePrueba(producto.id);
    const pedido = await crearPedidoDePrueba({ lineas: [{ productoId: producto.id, solicitada: 10 }] });
    const stockAntes = (await prisma.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual;
    const movimientosAntes = await prisma.movimientoInventario.count();

    await anularPedido(pedido.id, "Ya no lo necesitan", usuario.id);

    const anulado = await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id } });
    expect(anulado.estado).toBe("ANULADO");
    expect(anulado.motivoAnulacion).toBe("Ya no lo necesitan");
    expect(anulado.anuladaPorId).toBe(usuario.id);
    expect(anulado.anuladaEn).toBeInstanceOf(Date);
    expect((await prisma.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual).toBe(stockAntes);
    expect(await prisma.movimientoInventario.count()).toBe(movimientosAntes);
    expect((await listarPedidos({ estado: "por-atender", pagina: 1 })).total).toBe(0);
  });

  it("un PARCIAL con 6 de 10 entregadas conserva lo entregado y muestra saldo anulado 4 (E2, RN-43)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const producto = await crearProductoDePrueba();
    const pedido = await crearPedidoDePrueba({ lineas: [{ productoId: producto.id, solicitada: 10, entregada: 6 }] });

    await anularPedido(pedido.id, "Cierre del servicio", usuario.id);

    const detalle = await obtenerPedido(pedido.id);
    expect(detalle?.estado).toBe("ANULADO");
    expect(detalle?.lineas.map((l) => [l.solicitada, l.entregada, l.saldoAnulado])).toEqual([[10, 6, 4]]);
  });

  it("rechaza anular un ATENDIDO, un ANULADO o uno inexistente (E3, FR-012)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const producto = await crearProductoDePrueba();
    const atendido = await crearPedidoDePrueba({ lineas: [{ productoId: producto.id, solicitada: 5, entregada: 5 }] });
    const anulado = await crearPedidoDePrueba({ estado: "ANULADO", lineas: [{ productoId: producto.id, solicitada: 5 }] });

    expect((await errorDe(anularPedido(atendido.id, "Motivo", usuario.id))).message).toBe("El pedido ya está atendido y no se puede anular");
    expect((await errorDe(anularPedido(anulado.id, "Motivo", usuario.id))).message).toBe("El pedido ya está anulado");
    expect((await errorDe(anularPedido(999_999, "Motivo", usuario.id))).message).toBe("No existe el pedido indicado");
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: atendido.id } })).estado).toBe("ATENDIDO");
  });

  it("anulación y entrega que completa el pedido, simultáneas: gana una sola (caso borde)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const producto = await crearProductoDePrueba();
    const pedido = await crearPedidoDePrueba({ lineas: [{ productoId: producto.id, solicitada: 10, entregada: 6 }] });

    const [anulacion, entrega] = await Promise.allSettled([
      anularPedido(pedido.id, "Ya no lo necesitan", usuario.id),
      simularEntregaDePrueba({ pedidoId: pedido.id, productoId: producto.id, cantidad: 4 }),
    ]);

    const final = await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id }, include: { lineas: true } });
    expect([anulacion.status, entrega.status].filter((estado) => estado === "fulfilled")).toHaveLength(1);
    if (entrega.status === "fulfilled") {
      // Ganó la entrega: el pedido quedó ATENDIDO y la anulación lo encontró así.
      expect((anulacion as PromiseRejectedResult).reason.message).toBe("El pedido ya está atendido y no se puede anular");
      expect(final.estado).toBe("ATENDIDO");
      expect(final.lineas[0]!.cantidadEntregada).toBe(10);
    } else {
      // Ganó la anulación: la entrega se rechazó y lo entregado no cambió (FR-012).
      expect((entrega as PromiseRejectedResult).reason.message).toBe("El pedido está anulado");
      expect(final.estado).toBe("ANULADO");
      expect(final.lineas[0]!.cantidadEntregada).toBe(6);
    }
  });
});
