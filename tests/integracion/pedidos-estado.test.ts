// Estado calculado del pedido con entregas simuladas (FR-008, RN-35, RN-41; research P-02, P-03 y P-12).
// Las entregas imitan a F-005: bloquean el pedido, cambian lo entregado y recalculan el estado.
import { beforeEach, describe, expect, it } from "vitest";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { bloquearPedido } from "@/servicios/pedidos";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba } from "../ayudantes/catalogos";
import { crearPedidoDePrueba, simularEntregaDePrueba } from "../ayudantes/pedidos";

async function estadoDe(pedidoId: number) {
  return (await prisma.pedido.findUniqueOrThrow({ where: { id: pedidoId } })).estado;
}

describe("estado del pedido según lo entregado", () => {
  beforeEach(vaciarTablas);

  it("PENDIENTE → PARCIAL → ATENDIDO y de vuelta a PARCIAL y PENDIENTE al descontar (caso borde)", async () => {
    const a = await crearProductoDePrueba();
    const b = await crearProductoDePrueba();
    const pedido = await crearPedidoDePrueba({ lineas: [{ productoId: a.id, solicitada: 10 }, { productoId: b.id, solicitada: 5 }] });
    expect(pedido.estado).toBe("PENDIENTE");

    expect(await simularEntregaDePrueba({ pedidoId: pedido.id, productoId: a.id, cantidad: 6 })).toBe("PARCIAL");
    await simularEntregaDePrueba({ pedidoId: pedido.id, productoId: a.id, cantidad: 4 });
    expect(await simularEntregaDePrueba({ pedidoId: pedido.id, productoId: b.id, cantidad: 5 })).toBe("ATENDIDO");
    expect(await estadoDe(pedido.id)).toBe("ATENDIDO");

    // Anulación de distribuciones de F-005: lo entregado baja y el estado se recalcula.
    expect(await simularEntregaDePrueba({ pedidoId: pedido.id, productoId: b.id, cantidad: -5 })).toBe("PARCIAL");
    expect(await simularEntregaDePrueba({ pedidoId: pedido.id, productoId: a.id, cantidad: -10 })).toBe("PENDIENTE");
    expect(await estadoDe(pedido.id)).toBe("PENDIENTE");
  });

  it("un pedido ANULADO sigue ANULADO al descontar y rechaza una entrega positiva (RN-35, FR-012)", async () => {
    const producto = await crearProductoDePrueba();
    const pedido = await crearPedidoDePrueba({ estado: "ANULADO", lineas: [{ productoId: producto.id, solicitada: 10, entregada: 6 }] });

    expect(await simularEntregaDePrueba({ pedidoId: pedido.id, productoId: producto.id, cantidad: -6 })).toBe("ANULADO");
    const linea = await prisma.pedidoDetalle.findFirstOrThrow({ where: { pedidoId: pedido.id } });
    expect(linea.cantidadEntregada).toBe(0);

    await expect(simularEntregaDePrueba({ pedidoId: pedido.id, productoId: producto.id, cantidad: 1 })).rejects.toThrow("El pedido está anulado");
    expect(await estadoDe(pedido.id)).toBe("ANULADO");
  });

  it("bloquearPedido devuelve el estado del pedido y null si no existe", async () => {
    const producto = await crearProductoDePrueba();
    const pedido = await crearPedidoDePrueba({ lineas: [{ productoId: producto.id, solicitada: 10, entregada: 3 }] });

    const [bloqueado, inexistente] = await prisma.$transaction(async (tx) => [await bloquearPedido(tx, pedido.id), await bloquearPedido(tx, 999_999)]);
    expect(bloqueado).toEqual({ estado: "PARCIAL" });
    expect(inexistente).toBeNull();
  });

  it("dos entregas simultáneas de 3 sobre la misma línea dejan 6 entregadas y el pedido PARCIAL", async () => {
    const producto = await crearProductoDePrueba();
    const pedido = await crearPedidoDePrueba({ lineas: [{ productoId: producto.id, solicitada: 10 }] });

    await Promise.all([
      simularEntregaDePrueba({ pedidoId: pedido.id, productoId: producto.id, cantidad: 3 }),
      simularEntregaDePrueba({ pedidoId: pedido.id, productoId: producto.id, cantidad: 3 }),
    ]);

    const linea = await prisma.pedidoDetalle.findFirstOrThrow({ where: { pedidoId: pedido.id } });
    expect(linea.cantidadEntregada).toBe(6);
    expect(await estadoDe(pedido.id)).toBe("PARCIAL");
  });

  it("una entrega a un pedido inexistente se rechaza", async () => {
    await expect(simularEntregaDePrueba({ pedidoId: 999_999, productoId: 1, cantidad: 1 })).rejects.toBeInstanceOf(ErrorDeNegocio);
  });
});
