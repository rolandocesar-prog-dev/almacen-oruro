// Historia 2 · Reporte de distribuciones R-2 (FR-010, FR-003, SC-003).
import { beforeEach, describe, expect, it } from "vitest";
import { anularDistribucion, registrarDistribucion } from "@/servicios/distribuciones";
import { reporteDistribuciones } from "@/servicios/reportes";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { datosDistribucion, prepararPedidoConStock } from "../ayudantes/distribuciones";

const rango = { desde: "2026-09-01", hasta: "2026-09-30", incluirAnulados: false, pagina: 1 };

describe("reporteDistribuciones", () => {
  beforeEach(vaciarTablas);

  async function preparar() {
    const quispe = await prepararPedidoConStock({
      lineas: [
        { solicitada: 20, stock: 20, nombre: "Lavandina 1 L" },
        { solicitada: 10, stock: 10, nombre: "Jabón líquido" },
      ],
    });
    const mamani = await prepararPedidoConStock({ lineas: [{ solicitada: 10, stock: 10, nombre: "Trapeador" }] });

    const primera = await registrarDistribucion(datosDistribucion(quispe.pedido, [6, 2], { nroVale: "10", fecha: "2026-09-03" }), quispe.usuario.id);
    const segunda = await registrarDistribucion(datosDistribucion(quispe.pedido, [4, ""], { nroVale: "11", fecha: "2026-09-08" }), quispe.usuario.id);
    const otra = await registrarDistribucion(datosDistribucion(mamani.pedido, [3], { nroVale: "12", fecha: "2026-09-09" }), mamani.usuario.id);
    const anulada = await registrarDistribucion(datosDistribucion(quispe.pedido, [5, ""], { nroVale: "13", fecha: "2026-09-10" }), quispe.usuario.id);
    await anularDistribucion(anulada.id, "Vale equivocado", quispe.usuario.id);
    return { quispe, mamani, primera, segunda, otra, anulada };
  }

  it("lista una fila por línea entregada, ordenadas por fecha, y totaliza por producto (E1, E2, SC-003)", async () => {
    const { quispe, primera } = await preparar();

    const reporte = await reporteDistribuciones(rango);

    // 2 líneas de la primera + 1 de la segunda + 1 de la de otro representante; la anulada no aparece.
    expect(reporte.filas).toHaveLength(4);
    expect(reporte.filas[0]).toMatchObject({
      fecha: "2026-09-03",
      nroVale: "10",
      representante: `${quispe.representante.apellido}, ${quispe.representante.nombre}`,
      servicio: quispe.representante.servicio,
      producto: "Lavandina 1 L",
      cantidad: 6,
      estado: "REGISTRADA",
    });
    expect(reporte.filas[0]?.codigo).toEqual(expect.any(String));
    expect(reporte.filas[0]?.unidad).toEqual(expect.any(String));
    expect(reporte.filas.map((f) => f.nroVale)).toEqual(["10", "10", "11", "12"]);
    expect(reporte.totales.porProducto.map((p) => [p.nombre, p.cantidad])).toEqual([
      ["Jabón líquido", 2],
      ["Lavandina 1 L", 10],
      ["Trapeador", 3],
    ]);
    expect(primera.id).toBeGreaterThan(0);
  });

  it("con «incluir anuladas» la anulada aparece marcada y no suma en los totales (E4, FR-003)", async () => {
    await preparar();

    const reporte = await reporteDistribuciones({ ...rango, incluirAnulados: true });

    expect(reporte.filas).toHaveLength(5);
    expect(reporte.filas.filter((f) => f.estado === "ANULADA")).toHaveLength(1);
    expect(reporte.totales.porProducto.find((p) => p.nombre === "Lavandina 1 L")?.cantidad).toBe(10);
  });

  it("combina los filtros por representante y por producto (E3)", async () => {
    const p = await preparar();
    const lavandina = p.quispe.productos[0]!;

    const soloQuispe = await reporteDistribuciones({ ...rango, representanteId: p.quispe.representante.id });
    expect(soloQuispe.filas).toHaveLength(3);

    const combinado = await reporteDistribuciones({ ...rango, representanteId: p.quispe.representante.id, productoId: lavandina.id });
    expect(combinado.filas.map((f) => f.cantidad)).toEqual([6, 4]);
    expect(combinado.totales.porProducto).toEqual([expect.objectContaining({ nombre: "Lavandina 1 L", cantidad: 10 })]);
  });

  it("un rango sin entregas devuelve la lista y los totales vacíos", async () => {
    await preparar();

    const reporte = await reporteDistribuciones({ ...rango, desde: "2026-10-01", hasta: "2026-10-31" });

    expect(reporte.filas).toEqual([]);
    expect(reporte.totales.porProducto).toEqual([]);
  });
});
