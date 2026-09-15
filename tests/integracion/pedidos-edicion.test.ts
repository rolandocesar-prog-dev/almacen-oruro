// Historia 4 · Editar un pedido que aún no se atendió (FR-006, RN-42; research P-03 y P-04).
import { beforeEach, describe, expect, it } from "vitest";
import type { DatosPedido } from "@/esquemas/pedidos";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { calcularEstadoPedido, editarPedido } from "@/servicios/pedidos";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { crearMovimientoDePrueba, crearProductoDePrueba, crearRepresentanteDePrueba } from "../ayudantes/catalogos";
import { crearDistribucionDePedidoDePrueba, crearPedidoDePrueba, simularEntregaDePrueba } from "../ayudantes/pedidos";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

async function leerPedido(id: number) {
  return prisma.pedido.findUniqueOrThrow({ where: { id }, include: { lineas: { orderBy: { productoId: "asc" } } } });
}

function datos(representanteId: number, lineas: DatosPedido["lineas"], cambios: Partial<DatosPedido> = {}): DatosPedido {
  return { representanteId, fecha: "2026-09-01", observacion: undefined, lineas, ...cambios };
}

describe("editarPedido", () => {
  beforeEach(vaciarTablas);

  async function preparar() {
    const representante = await crearRepresentanteDePrueba();
    // Uno tras otro: ids a < b < c para comparar las líneas en orden de producto.
    const a = await crearProductoDePrueba();
    const b = await crearProductoDePrueba();
    const c = await crearProductoDePrueba();
    const pedido = await crearPedidoDePrueba({
      representanteId: representante.id,
      lineas: [{ productoId: a.id, solicitada: 10 }, { productoId: b.id, solicitada: 5 }],
    });
    return { representante, a, b, c, pedido };
  }

  it("agrega, quita y cambia líneas conservando número, registro y estado, sin tocar el stock (E1)", async () => {
    const { representante, a, b, c, pedido } = await preparar();
    await crearMovimientoDePrueba(a.id);
    const stockAntes = await prisma.producto.findMany({ select: { id: true, stockActual: true }, orderBy: { id: "asc" } });
    const movimientosAntes = await prisma.movimientoInventario.count();
    const antes = await leerPedido(pedido.id);

    // Se quita b, se cambia a de 10 a 7 y se agrega c.
    await editarPedido(pedido.id, datos(representante.id, [{ productoId: a.id, cantidadSolicitada: 7 }, { productoId: c.id, cantidadSolicitada: 2 }]));

    const despues = await leerPedido(pedido.id);
    expect(despues.id).toBe(antes.id);
    expect(despues.usuarioId).toBe(antes.usuarioId);
    expect(despues.creadoEn).toEqual(antes.creadoEn);
    expect(despues.estado).toBe("PENDIENTE");
    expect(despues.lineas.map((l) => [l.productoId, l.cantidadSolicitada, l.cantidadEntregada])).toEqual([
      [a.id, 7, 0],
      [c.id, 2, 0],
    ]);
    // La línea que sigue conserva su fila: las referencias de distribuciones anuladas no se rompen (P-04).
    expect(despues.lineas[0]!.id).toBe(antes.lineas[0]!.id);
    expect(await prisma.producto.findMany({ select: { id: true, stockActual: true }, orderBy: { id: "asc" } })).toEqual(stockAntes);
    expect(await prisma.movimientoInventario.count()).toBe(movimientosAntes);
    expect(b.id).toBeGreaterThan(0);
  });

  it("cambia representante, fecha y observación", async () => {
    const { a, pedido } = await preparar();
    const otro = await crearRepresentanteDePrueba();

    await editarPedido(pedido.id, datos(otro.id, [{ productoId: a.id, cantidadSolicitada: 10 }], { fecha: "2026-08-28", observacion: "Corregido" }));

    const despues = await leerPedido(pedido.id);
    expect(despues.representanteId).toBe(otro.id);
    expect(despues.fecha).toEqual(new Date("2026-08-28T00:00:00Z"));
    expect(despues.observacion).toBe("Corregido");
  });

  it.each([
    ["PARCIAL", 4, "El pedido ya tiene entregas y no se puede editar"],
    ["ATENDIDO", 10, "El pedido ya tiene entregas y no se puede editar"],
  ])("rechaza editar un pedido %s sin cambiar nada (E2, RN-42)", async (_estado, entregada, mensaje) => {
    const representante = await crearRepresentanteDePrueba();
    const producto = await crearProductoDePrueba();
    const pedido = await crearPedidoDePrueba({ representanteId: representante.id, lineas: [{ productoId: producto.id, solicitada: 10, entregada }] });
    const antes = await leerPedido(pedido.id);

    const error = await errorDe(editarPedido(pedido.id, datos(representante.id, [{ productoId: producto.id, cantidadSolicitada: 20 }])));
    expect(error.message).toBe(mensaje);
    expect(await leerPedido(pedido.id)).toEqual(antes);
  });

  it("rechaza editar un pedido ANULADO o inexistente", async () => {
    const representante = await crearRepresentanteDePrueba();
    const producto = await crearProductoDePrueba();
    const pedido = await crearPedidoDePrueba({ representanteId: representante.id, estado: "ANULADO", lineas: [{ productoId: producto.id, solicitada: 10 }] });
    const lineas = [{ productoId: producto.id, cantidadSolicitada: 3 }];

    expect((await errorDe(editarPedido(pedido.id, datos(representante.id, lineas)))).message).toBe("El pedido está anulado y no se puede editar");
    expect((await errorDe(editarPedido(999_999, datos(representante.id, lineas)))).message).toBe("No existe el pedido indicado");
  });

  it("una edición con un producto inactivo nuevo deja el pedido como estaba (E4)", async () => {
    const { representante, a, pedido } = await preparar();
    const inactivo = await crearProductoDePrueba({ nombre: "Cera líquida", activo: false });
    const antes = await leerPedido(pedido.id);

    const error = await errorDe(
      editarPedido(pedido.id, datos(representante.id, [{ productoId: a.id, cantidadSolicitada: 1 }, { productoId: inactivo.id, cantidadSolicitada: 1 }], { observacion: "No debe quedar" })),
    );
    expect(error.message).toBe("Línea 2: el producto 'Cera líquida' está inactivo: elige uno activo");
    expect(error.campo).toBe("lineas.1.productoId");
    expect(await leerPedido(pedido.id)).toEqual(antes);
  });

  it("conserva el representante y un producto que se desactivaron, pero no acepta otro inactivo (FR-006, caso borde)", async () => {
    const { representante, a, b, pedido } = await preparar();
    await prisma.representante.update({ where: { id: representante.id }, data: { activo: false } });
    await prisma.producto.update({ where: { id: a.id }, data: { activo: false } });

    await editarPedido(pedido.id, datos(representante.id, [{ productoId: a.id, cantidadSolicitada: 3 }, { productoId: b.id, cantidadSolicitada: 5 }]));
    expect((await leerPedido(pedido.id)).lineas.map((l) => l.cantidadSolicitada)).toEqual([3, 5]);

    const otroInactivo = await crearRepresentanteDePrueba({ nombre: "Luis", apellido: "Choque", activo: false });
    const error = await errorDe(editarPedido(pedido.id, datos(otroInactivo.id, [{ productoId: b.id, cantidadSolicitada: 5 }])));
    expect(error.message).toBe("El representante 'Choque, Luis' está inactivo: elige uno activo");
  });

  it("no quita una línea que figura en distribuciones anuladas, pero sí cambia su cantidad (caso borde)", async () => {
    const representante = await crearRepresentanteDePrueba();
    const a = await crearProductoDePrueba({ nombre: "Lavandina 1 L" });
    const b = await crearProductoDePrueba();
    const pedido = await crearPedidoDePrueba({ representanteId: representante.id, lineas: [{ productoId: a.id, solicitada: 10 }, { productoId: b.id, solicitada: 5 }] });
    await crearDistribucionDePedidoDePrueba({ pedidoId: pedido.id, productoId: a.id, cantidad: 4 });
    const antes = await leerPedido(pedido.id);

    const error = await errorDe(editarPedido(pedido.id, datos(representante.id, [{ productoId: b.id, cantidadSolicitada: 5 }])));
    expect(error.message).toBe("No se puede quitar 'Lavandina 1 L': figura en distribuciones anuladas del pedido. Puedes cambiar su cantidad");
    expect(await leerPedido(pedido.id)).toEqual(antes);

    await editarPedido(pedido.id, datos(representante.id, [{ productoId: a.id, cantidadSolicitada: 8 }, { productoId: b.id, cantidadSolicitada: 5 }]));
    expect((await leerPedido(pedido.id)).lineas.map((l) => l.cantidadSolicitada)).toEqual([8, 5]);
  });

  it("edición y entrega simultáneas: gana una y el estado final coincide con las cantidades (E3)", async () => {
    const { representante, a, b, pedido } = await preparar();

    const [edicion, entrega] = await Promise.allSettled([
      editarPedido(pedido.id, datos(representante.id, [{ productoId: a.id, cantidadSolicitada: 12 }, { productoId: b.id, cantidadSolicitada: 5 }])),
      simularEntregaDePrueba({ pedidoId: pedido.id, productoId: a.id, cantidad: 3 }),
    ]);

    expect(entrega.status).toBe("fulfilled");
    const final = await leerPedido(pedido.id);
    if (edicion.status === "rejected") {
      // Ganó la entrega: el pedido ya no estaba PENDIENTE cuando la edición obtuvo el bloqueo.
      expect((edicion.reason as ErrorDeNegocio).message).toBe("El pedido ya tiene entregas y no se puede editar");
      expect(final.lineas.map((l) => l.cantidadSolicitada)).toEqual([10, 5]);
    } else {
      // Ganó la edición: la entrega se aplicó sobre las líneas ya editadas.
      expect(final.lineas.map((l) => l.cantidadSolicitada)).toEqual([12, 5]);
    }
    expect(final.lineas.map((l) => l.cantidadEntregada)).toEqual([3, 0]);
    expect(final.estado).toBe(calcularEstadoPedido(final.lineas));
    expect(final.estado).toBe("PARCIAL");
  });
});
