// Historia 4 · Anular una distribución mal registrada (FR-013 a FR-015, RN-35, RN-53; research V-06).
import { beforeEach, describe, expect, it } from "vitest";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { anularDistribucion, registrarDistribucion } from "@/servicios/distribuciones";
import { verificarConsistenciaInventario } from "@/servicios/inventario";
import { anularPedido, editarPedido, obtenerPedido } from "@/servicios/pedidos";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { datosDistribucion, prepararPedidoConStock } from "../ayudantes/distribuciones";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

async function stockDe(productoId: number) {
  return (await prisma.producto.findUniqueOrThrow({ where: { id: productoId } })).stockActual;
}

async function estadoDe(pedidoId: number) {
  return (await prisma.pedido.findUniqueOrThrow({ where: { id: pedidoId } })).estado;
}

async function consistente() {
  expect((await verificarConsistenciaInventario()).diferencias).toEqual([]);
}

describe("anularDistribucion", () => {
  beforeEach(vaciarTablas);

  it("queda ANULADA, repone el stock con ANULACION_DISTRIBUCION y descuenta lo entregado (E1, RN-35)", async () => {
    const { usuario, productos, pedido } = await prepararPedidoConStock({
      lineas: [
        { solicitada: 10, stock: 8 },
        { solicitada: 5, stock: 5 },
      ],
    });
    const { id } = await registrarDistribucion(datosDistribucion(pedido, [6, 2]), usuario.id);

    await anularDistribucion(id, "Cantidades mal cargadas", usuario.id);

    const anulada = await prisma.distribucion.findUniqueOrThrow({ where: { id } });
    expect(anulada).toMatchObject({ estado: "ANULADA", motivoAnulacion: "Cantidades mal cargadas", anuladaPorId: usuario.id });
    expect(anulada.anuladaEn).toBeInstanceOf(Date);
    const inversos = await prisma.movimientoInventario.findMany({ where: { distribucionId: id, tipo: "ANULACION_DISTRIBUCION" }, orderBy: { productoId: "asc" } });
    expect(inversos.map((m) => [m.productoId, m.cantidad, m.saldoResultante])).toEqual([
      [productos[0]!.id, 6, 8],
      [productos[1]!.id, 2, 5],
    ]);
    expect(await stockDe(productos[0]!.id)).toBe(8);
    expect(await stockDe(productos[1]!.id)).toBe(5);
    const lineas = await prisma.pedidoDetalle.findMany({ where: { pedidoId: pedido.id }, orderBy: { id: "asc" } });
    expect(lineas.map((l) => l.cantidadEntregada)).toEqual([0, 0]);
    expect(await estadoDe(pedido.id)).toBe("PENDIENTE");
    await consistente();
  });

  it("anular la única distribución de un pedido ATENDIDO lo devuelve a PENDIENTE (E2)", async () => {
    const { usuario, productos, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 4, stock: 4 }] });
    const { id } = await registrarDistribucion(datosDistribucion(pedido, [4]), usuario.id);
    expect(await estadoDe(pedido.id)).toBe("ATENDIDO");

    await anularDistribucion(id, "Vale equivocado", usuario.id);

    expect(await estadoDe(pedido.id)).toBe("PENDIENTE");
    expect(await stockDe(productos[0]!.id)).toBe(4);
  });

  it("anular una de dos distribuciones de un pedido ATENDIDO lo deja PARCIAL (E3)", async () => {
    const { usuario, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 6, stock: 6 }] });
    const primera = await registrarDistribucion(datosDistribucion(pedido, [2], { nroVale: "1" }), usuario.id);
    await registrarDistribucion(datosDistribucion(pedido, [4], { nroVale: "2" }), usuario.id);
    expect(await estadoDe(pedido.id)).toBe("ATENDIDO");

    await anularDistribucion(primera.id, "Duplicada", usuario.id);

    expect(await estadoDe(pedido.id)).toBe("PARCIAL");
    await consistente();
  });

  it("en un pedido ANULADO repone el stock, sube el saldo anulado y el pedido sigue ANULADO (E4, RN-35)", async () => {
    const { usuario, productos, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 10, stock: 6 }] });
    const { id } = await registrarDistribucion(datosDistribucion(pedido, [6]), usuario.id);
    await anularPedido(pedido.id, "Ya no lo necesitan", usuario.id);

    await anularDistribucion(id, "Salida mal registrada", usuario.id);

    expect(await stockDe(productos[0]!.id)).toBe(6);
    const detalle = await obtenerPedido(pedido.id);
    expect(detalle?.estado).toBe("ANULADO");
    expect(detalle?.lineas.map((l) => [l.entregada, l.saldoAnulado])).toEqual([[0, 10]]);
    await consistente();
  });

  it("no se anula dos veces ni una inexistente (E6, FR-015)", async () => {
    const { usuario, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 4, stock: 4 }] });
    const { id } = await registrarDistribucion(datosDistribucion(pedido, [2]), usuario.id);
    await anularDistribucion(id, "Error", usuario.id);

    expect((await errorDe(anularDistribucion(id, "Otra vez", usuario.id))).message).toBe("La distribución ya está anulada");
    expect((await errorDe(anularDistribucion(999_999, "Error", usuario.id))).message).toBe("No existe la distribución indicada");
    expect(await prisma.movimientoInventario.count({ where: { tipo: "ANULACION_DISTRIBUCION" } })).toBe(1);
  });

  it("el vale de una distribución anulada queda libre (E7, RN-31)", async () => {
    const { usuario, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 4, stock: 4 }] });
    const { id } = await registrarDistribucion(datosDistribucion(pedido, [2]), usuario.id);
    await anularDistribucion(id, "Error", usuario.id);

    await registrarDistribucion(datosDistribucion(pedido, [3]), usuario.id);

    expect(await prisma.distribucion.count({ where: { nroVale: "500" } })).toBe(2);
  });

  it("los movimientos de anulación llevan la fecha de la distribución anulada (E8, RN-53)", async () => {
    const { usuario, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 4, stock: 4 }], fechaPedido: "2026-08-10" });
    const { id } = await registrarDistribucion(datosDistribucion(pedido, [2], { fecha: "2026-08-20" }), usuario.id);

    await anularDistribucion(id, "Error", usuario.id);

    const inverso = await prisma.movimientoInventario.findFirstOrThrow({ where: { distribucionId: id, tipo: "ANULACION_DISTRIBUCION" } });
    expect(inverso.fechaDocumento).toEqual(new Date("2026-08-20T00:00:00Z"));
  });

  it("dos anulaciones simultáneas de la misma distribución revierten una sola vez", async () => {
    const { usuario, productos, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 4, stock: 4 }] });
    const { id } = await registrarDistribucion(datosDistribucion(pedido, [3]), usuario.id);

    const resultados = await Promise.allSettled([anularDistribucion(id, "Uno", usuario.id), anularDistribucion(id, "Dos", usuario.id)]);

    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.movimientoInventario.count({ where: { distribucionId: id, tipo: "ANULACION_DISTRIBUCION" } })).toBe(1);
    expect(await stockDe(productos[0]!.id)).toBe(4);
    expect((await prisma.pedidoDetalle.findFirstOrThrow({ where: { pedidoId: pedido.id } })).cantidadEntregada).toBe(0);
    await consistente();
  });

  it("el pedido que volvió a PENDIENTE se puede editar, pero la línea con historial no se quita (F-004)", async () => {
    const { usuario, representante, productos, pedido } = await prepararPedidoConStock({
      lineas: [
        { solicitada: 4, stock: 4, nombre: "Lavandina 1 L" },
        { solicitada: 2, stock: 2 },
      ],
    });
    const { id } = await registrarDistribucion(datosDistribucion(pedido, [4, ""]), usuario.id);
    await anularDistribucion(id, "Error", usuario.id);

    const sinLavandina = { representanteId: representante.id, fecha: "2026-09-01", observacion: undefined, lineas: [{ productoId: productos[1]!.id, cantidadSolicitada: 2 }] };
    expect((await errorDe(editarPedido(pedido.id, sinLavandina))).message).toBe(
      "No se puede quitar 'Lavandina 1 L': figura en distribuciones anuladas del pedido. Puedes cambiar su cantidad",
    );

    await editarPedido(pedido.id, { ...sinLavandina, lineas: [{ productoId: productos[0]!.id, cantidadSolicitada: 3 }, ...sinLavandina.lineas] });
    expect((await prisma.pedidoDetalle.findMany({ where: { pedidoId: pedido.id }, orderBy: { id: "asc" } })).map((l) => l.cantidadSolicitada)).toEqual([3, 2]);
  });
});
