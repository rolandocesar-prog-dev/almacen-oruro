// Historia 5 · Reporte de pedidos R-5 (FR-013).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { registrarDistribucion } from "@/servicios/distribuciones";
import { anularPedido } from "@/servicios/pedidos";
import { reportePedidos } from "@/servicios/reportes";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { crearRepresentanteDePrueba } from "../ayudantes/catalogos";
import { datosDistribucion, prepararPedidoConStock } from "../ayudantes/distribuciones";

const rango = { desde: "2026-09-01", hasta: "2026-09-30", estado: "todos" as const, incluirAnulados: false, pagina: 1 };

describe("reportePedidos", () => {
  beforeEach(vaciarTablas);

  async function preparar() {
    const otroRepresentante = await crearRepresentanteDePrueba({ nombre: "Luis", apellido: "Mamani" });
    const pedidos = [];
    // 3 pendientes (uno de otro representante), 2 parciales, 4 atendidos y 1 anulado.
    for (let i = 0; i < 3; i += 1) {
      const preparado = await prepararPedidoConStock({ lineas: [{ solicitada: 10, stock: 10 }] });
      if (i === 2) await prisma.pedido.update({ where: { id: preparado.pedido.id }, data: { representanteId: otroRepresentante.id } });
      pedidos.push(preparado);
    }
    for (let i = 0; i < 2; i += 1) {
      const preparado = await prepararPedidoConStock({ lineas: [{ solicitada: 10, stock: 10 }] });
      await registrarDistribucion(datosDistribucion(preparado.pedido, [4], { nroVale: `20${i}` }), preparado.usuario.id);
      pedidos.push(preparado);
    }
    for (let i = 0; i < 4; i += 1) {
      const preparado = await prepararPedidoConStock({ lineas: [{ solicitada: 5, stock: 5 }] });
      await registrarDistribucion(datosDistribucion(preparado.pedido, [5], { nroVale: `30${i}` }), preparado.usuario.id);
      pedidos.push(preparado);
    }
    const anulado = await prepararPedidoConStock({ lineas: [{ solicitada: 8, stock: 8 }] });
    await anularPedido(anulado.pedido.id, "Ya no lo necesitan", anulado.usuario.id);
    return { pedidos, anulado, otroRepresentante };
  }

  it("cuenta los pedidos por estado y no muestra los anulados por defecto (E1, E2)", async () => {
    await preparar();

    const reporte = await reportePedidos(rango);

    expect(reporte.filas).toHaveLength(9);
    expect(reporte.totales.porEstado).toEqual({ PENDIENTE: 3, PARCIAL: 2, ATENDIDO: 4, ANULADO: 1 });
    expect(reporte.filas.map((f) => f.estado)).not.toContain("ANULADO");
    expect(reporte.filas[0]).toMatchObject({ fecha: "2026-09-01", productos: 1, porcentajeAtendido: 0, estado: "PENDIENTE" });
    expect(reporte.filas.find((f) => f.estado === "PARCIAL")?.porcentajeAtendido).toBe(40);
  });

  it("con «incluir anulados» aparece el anulado y los totales no cambian (E2, FR-003)", async () => {
    const { anulado } = await preparar();

    const reporte = await reportePedidos({ ...rango, incluirAnulados: true });

    expect(reporte.filas).toHaveLength(10);
    expect(reporte.filas.find((f) => f.id === anulado.pedido.id)?.estado).toBe("ANULADO");
    expect(reporte.totales.porEstado).toEqual({ PENDIENTE: 3, PARCIAL: 2, ATENDIDO: 4, ANULADO: 1 });
  });

  it("el estado ANULADO los muestra sin marcar «incluir anulados» (E3, FR-013)", async () => {
    const { anulado } = await preparar();

    const reporte = await reportePedidos({ ...rango, estado: "anulados" });

    expect(reporte.filas.map((f) => f.id)).toEqual([anulado.pedido.id]);
    expect(reporte.filas[0]?.estado).toBe("ANULADO");
  });

  it("filtra por estado y por representante (E4)", async () => {
    const { otroRepresentante } = await preparar();

    const atendidos = await reportePedidos({ ...rango, estado: "atendidos" });
    expect(atendidos.filas.map((f) => f.estado)).toEqual(["ATENDIDO", "ATENDIDO", "ATENDIDO", "ATENDIDO"]);

    const suyos = await reportePedidos({ ...rango, representanteId: otroRepresentante.id });
    expect(suyos.filas).toHaveLength(1);
    expect(suyos.filas[0]?.representante).toBe("Mamani, Luis");
    expect(suyos.totales.porEstado).toEqual({ PENDIENTE: 1, PARCIAL: 0, ATENDIDO: 0, ANULADO: 0 });
  });

  it("el porcentaje atendido incluye distribuciones posteriores al rango (caso borde)", async () => {
    const preparado = await prepararPedidoConStock({ lineas: [{ solicitada: 10, stock: 10 }], fechaPedido: "2026-09-10" });
    await registrarDistribucion(datosDistribucion(preparado.pedido, [5], { nroVale: "900", fecha: "2026-10-05" }), preparado.usuario.id);

    const reporte = await reportePedidos({ ...rango, desde: "2026-09-01", hasta: "2026-09-30" });

    expect(reporte.filas).toHaveLength(1);
    expect(reporte.filas[0]?.porcentajeAtendido).toBe(50);
  });

  it("un rango sin pedidos devuelve la lista vacía y los cuatro estados en 0", async () => {
    await preparar();

    const reporte = await reportePedidos({ ...rango, desde: "2026-11-01", hasta: "2026-11-30" });

    expect(reporte.filas).toEqual([]);
    expect(reporte.totales.porEstado).toEqual({ PENDIENTE: 0, PARCIAL: 0, ATENDIDO: 0, ANULADO: 0 });
  });
});
