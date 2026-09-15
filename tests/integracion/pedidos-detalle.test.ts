// Historia 3 · Ver el detalle de un pedido (FR-014, FR-015, RN-43; research P-08).
import { beforeEach, describe, expect, it } from "vitest";
import { accionesSegunEstado, obtenerPedido } from "@/servicios/pedidos";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba } from "../ayudantes/catalogos";
import { prisma } from "@/lib/prisma";
import { crearDistribucionDePedidoDePrueba, crearPedidoDePrueba, simularEntregaDePrueba } from "../ayudantes/pedidos";

describe("obtenerPedido", () => {
  beforeEach(vaciarTablas);

  it("líneas 10/6 y 5/5 muestran pendiente 4 y 0 y el estado PARCIAL (E2)", async () => {
    const a = await crearProductoDePrueba();
    const b = await crearProductoDePrueba();
    const pedido = await crearPedidoDePrueba({ lineas: [{ productoId: a.id, solicitada: 10 }, { productoId: b.id, solicitada: 5 }] });
    await simularEntregaDePrueba({ pedidoId: pedido.id, productoId: a.id, cantidad: 6 });
    await simularEntregaDePrueba({ pedidoId: pedido.id, productoId: b.id, cantidad: 5 });

    const detalle = await obtenerPedido(pedido.id);
    expect(detalle?.estado).toBe("PARCIAL");
    expect(detalle?.lineas.map((l) => [l.solicitada, l.entregada, l.pendiente, l.saldoAnulado])).toEqual([
      [10, 6, 4, null],
      [5, 5, 0, null],
    ]);
  });

  it("lista las distribuciones del pedido con Nº de vale, fecha, estado y unidades (E3; SC-008 de F-005)", async () => {
    const producto = await crearProductoDePrueba();
    const pedido = await crearPedidoDePrueba({ lineas: [{ productoId: producto.id, solicitada: 10 }] });
    const primera = await crearDistribucionDePedidoDePrueba({ pedidoId: pedido.id, productoId: producto.id, cantidad: 4, fecha: "2026-09-03" });
    const segunda = await crearDistribucionDePedidoDePrueba({ pedidoId: pedido.id, productoId: producto.id, cantidad: 2, estado: "REGISTRADA", fecha: "2026-09-04" });

    const detalle = await obtenerPedido(pedido.id);
    expect(detalle?.distribuciones).toEqual([
      { id: primera.id, nroVale: primera.nroVale, fecha: "2026-09-03", estado: "ANULADA", unidades: 4 },
      { id: segunda.id, nroVale: segunda.nroVale, fecha: "2026-09-04", estado: "REGISTRADA", unidades: 2 },
    ]);
  });

  it("un pedido ANULADO con 6 de 10 entregadas trae saldo anulado 4, motivo, quién y cuándo (E4)", async () => {
    const { usuario } = await crearUsuarioDePrueba({ nombre: "Rosa", apellido: "Mamani" });
    const producto = await crearProductoDePrueba();
    const pedido = await crearPedidoDePrueba({ estado: "ANULADO", lineas: [{ productoId: producto.id, solicitada: 10, entregada: 6 }] });
    await prisma.pedido.update({ where: { id: pedido.id }, data: { anuladaPorId: usuario.id, motivoAnulacion: "Ya no lo necesitan" } });

    const detalle = await obtenerPedido(pedido.id);
    expect(detalle?.lineas.map((l) => [l.solicitada, l.entregada, l.saldoAnulado])).toEqual([[10, 6, 4]]);
    expect(detalle?.motivoAnulacion).toBe("Ya no lo necesitan");
    expect(detalle?.anuladoPor).toBe("Rosa Mamani");
    expect(detalle?.anuladoEn).toBeInstanceOf(Date);
  });

  it("ofrece las acciones según el estado (E5, FR-015)", async () => {
    const producto = await crearProductoDePrueba();
    const acciones = async (entregada: number, estado?: "ANULADO") =>
      (await obtenerPedido((await crearPedidoDePrueba({ estado, lineas: [{ productoId: producto.id, solicitada: 10, entregada }] })).id))?.acciones;

    expect(await acciones(0)).toEqual({ editar: true, anular: true, distribuir: true });
    expect(await acciones(4)).toEqual({ editar: false, anular: true, distribuir: true });
    expect(await acciones(10)).toEqual({ editar: false, anular: false, distribuir: false });
    expect(await acciones(4, "ANULADO")).toEqual({ editar: false, anular: false, distribuir: false });
    expect(accionesSegunEstado("ATENDIDO")).toEqual({ editar: false, anular: false, distribuir: false });
  });

  it("devuelve null si el pedido no existe", async () => {
    expect(await obtenerPedido(999)).toBeNull();
  });
});
