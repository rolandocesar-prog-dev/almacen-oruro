// Historia 3 · Listar distribuciones (FR-010, research V-07).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { DISTRIBUCIONES_POR_PAGINA, listarDistribuciones, registrarDistribucion } from "@/servicios/distribuciones";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { datosDistribucion, prepararPedidoConStock } from "../ayudantes/distribuciones";
import { fechaDeDocumento } from "../ayudantes/inventario";

const filtroBase = { desde: "2026-09-01", hasta: "2026-09-30", estado: "todas" as const, pagina: 1 };

describe("listarDistribuciones", () => {
  beforeEach(vaciarTablas);

  async function preparar() {
    const quispe = await prepararPedidoConStock({ lineas: [{ solicitada: 10, stock: 20 }, { solicitada: 10, stock: 20 }], fechaPedido: "2026-08-01" });
    const mamani = await prepararPedidoConStock({ lineas: [{ solicitada: 10, stock: 20 }] });
    const [lavandina, jabon] = quispe.productos;

    const agosto = await registrarDistribucion(datosDistribucion(quispe.pedido, [1, ""], { nroVale: "300", fecha: "2026-08-20" }), quispe.usuario.id);
    const primera = await registrarDistribucion(datosDistribucion(quispe.pedido, [2, 3], { nroVale: "510", fecha: "2026-09-02" }), quispe.usuario.id);
    const segunda = await registrarDistribucion(datosDistribucion(mamani.pedido, [4], { nroVale: "520", fecha: "2026-09-05" }), mamani.usuario.id);
    const anulada = await registrarDistribucion(datosDistribucion(quispe.pedido, ["", 1], { nroVale: "610", fecha: "2026-09-10" }), quispe.usuario.id);
    await prisma.distribucion.update({
      where: { id: anulada.id },
      data: { estado: "ANULADA", motivoAnulacion: "Prueba", anuladaEn: new Date(), anuladaPorId: quispe.usuario.id },
    });
    return { quispe, mamani, lavandina: lavandina!, jabon: jabon!, agosto, primera, segunda, anulada };
  }

  it("lista las del rango de fechas, de la más reciente a la más antigua, con sus columnas (E1)", async () => {
    const { quispe, primera, segunda, anulada } = await preparar();

    const { distribuciones, total } = await listarDistribuciones(filtroBase);

    expect(total).toBe(3);
    expect(distribuciones.map((d) => d.id)).toEqual([anulada.id, segunda.id, primera.id]);
    expect(distribuciones[2]).toEqual({
      id: primera.id,
      fecha: "2026-09-02",
      nroVale: "510",
      pedidoId: quispe.pedido.id,
      representante: `${quispe.representante.apellido}, ${quispe.representante.nombre}`,
      servicio: quispe.representante.servicio,
      productos: 2,
      unidades: 5,
      estado: "REGISTRADA",
    });
  });

  it("filtra por representante, producto, estado y vale, también combinados (E2)", async () => {
    const p = await preparar();
    const ids = async (cambios: Partial<Parameters<typeof listarDistribuciones>[0]>) =>
      (await listarDistribuciones({ ...filtroBase, ...cambios })).distribuciones.map((d) => d.id);

    expect(await ids({ representanteId: p.mamani.representante.id })).toEqual([p.segunda.id]);
    expect(await ids({ productoId: p.jabon.id })).toEqual([p.anulada.id, p.primera.id]);
    expect(await ids({ estado: "registradas" })).toEqual([p.segunda.id, p.primera.id]);
    expect(await ids({ estado: "anuladas" })).toEqual([p.anulada.id]);
    expect(await ids({ vale: "5" })).toEqual([p.segunda.id, p.primera.id]);
    expect(await ids({ representanteId: p.quispe.representante.id, productoId: p.lavandina.id, estado: "registradas" })).toEqual([p.primera.id]);
    expect(await ids({ desde: "2026-08-01", hasta: "2026-08-31" })).toEqual([p.agosto.id]);
  });

  it(`pagina de a ${DISTRIBUCIONES_POR_PAGINA}`, async () => {
    const { usuario, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 1000, stock: 0 }] });
    // Solo para contar filas: distribuciones insertadas sin movimientos, porque el listado no mira el stock.
    for (let i = 0; i < DISTRIBUCIONES_POR_PAGINA + 1; i += 1) {
      await prisma.distribucion.create({
        data: {
          pedidoId: pedido.id,
          nroVale: String(1000 + i),
          fecha: fechaDeDocumento("2026-09-03"),
          usuarioId: usuario.id,
          lineas: { create: [{ pedidoDetalleId: pedido.lineas[0]!.id, cantidad: 1 }] },
        },
      });
    }

    const primera = await listarDistribuciones(filtroBase);
    const segunda = await listarDistribuciones({ ...filtroBase, pagina: 2 });
    expect(primera.total).toBe(DISTRIBUCIONES_POR_PAGINA + 1);
    expect(primera.distribuciones).toHaveLength(DISTRIBUCIONES_POR_PAGINA);
    expect(segunda.distribuciones).toHaveLength(1);
  });
});
