// Historia 2 · Completar un pedido en varias entregas (RN-33, RN-41, X-09).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { registrarCompra } from "@/servicios/compras";
import { obtenerPedidoParaDistribuir, registrarDistribucion } from "@/servicios/distribuciones";
import { listarPedidos } from "@/servicios/pedidos";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProveedorDePrueba } from "../ayudantes/catalogos";
import { datosDistribucion, prepararPedidoConStock } from "../ayudantes/distribuciones";

describe("entregas sucesivas de un pedido", () => {
  beforeEach(vaciarTablas);

  it("dos distribuciones completan el pedido: PARCIAL y después ATENDIDO, fuera de los pedidos por atender (E1, E2, E3)", async () => {
    const { usuario, productos, pedido } = await prepararPedidoConStock({
      lineas: [
        { solicitada: 10, stock: 6 },
        { solicitada: 5, stock: 20 },
      ],
    });

    await registrarDistribucion(datosDistribucion(pedido, [6, 5], { nroVale: "1" }), usuario.id);
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id } })).estado).toBe("PARCIAL");

    // E3: la línea completa ya no admite cantidad.
    const paraDistribuir = await obtenerPedidoParaDistribuir(pedido.id);
    expect(paraDistribuir?.lineas.map((l) => [l.pendiente, l.situacion, l.maximoEntregable])).toEqual([
      [4, "sin-stock", 0],
      [0, "completa", 0],
    ]);

    // Llega la compra y se completa lo pendiente.
    const proveedor = await crearProveedorDePrueba();
    await registrarCompra({ proveedorId: proveedor.id, nroFactura: "900", fecha: "2026-09-05", lineas: [{ productoId: productos[0]!.id, cantidad: 10, precioUnitario: "10" }] }, usuario.id);
    await registrarDistribucion(datosDistribucion(pedido, [4, ""], { nroVale: "2" }), usuario.id);

    const final = await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id }, include: { lineas: { orderBy: { id: "asc" } } } });
    expect(final.estado).toBe("ATENDIDO");
    expect(final.lineas.map((l) => [l.cantidadSolicitada, l.cantidadEntregada])).toEqual([
      [10, 10],
      [5, 5],
    ]);
    expect((await listarPedidos({ estado: "por-atender", pagina: 1 })).pedidos.map((p) => p.id)).not.toContain(pedido.id);

    await expect(registrarDistribucion(datosDistribucion(pedido, [1, ""], { nroVale: "3" }), usuario.id)).rejects.toThrow(
      "El pedido ya está atendido: no queda nada por entregar",
    );
  });
});
