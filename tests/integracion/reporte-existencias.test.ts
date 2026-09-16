// Historia 3 · Reporte de existencias R-3 (FR-011, RN-52).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { listarExistencias } from "@/servicios/inventario";
import { reporteExistencias } from "@/servicios/reportes";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { crearCategoriaDePrueba, crearMovimientoDePrueba, crearProductoDePrueba, crearUnidadDePrueba } from "../ayudantes/catalogos";

describe("reporteExistencias", () => {
  beforeEach(vaciarTablas);

  async function preparar() {
    const limpieza = await crearCategoriaDePrueba({ nombre: "Limpieza" });
    const bolsas = await crearCategoriaDePrueba({ nombre: "Bolsas" });
    const unidad = await crearUnidadDePrueba({ nombre: "Bidón 5 L", abreviatura: "BID5" });
    const comun = { categoriaId: limpieza.id, unidadMedidaId: unidad.id };

    // Con stock 1 (una compra de prueba) y mínimo 0: por encima del mínimo.
    const sobreMinimo = await crearProductoDePrueba({ ...comun, nombre: "Lavandina 1 L", stockMinimo: 0 });
    await crearMovimientoDePrueba(sobreMinimo.id);
    // Sin stock y mínimo 5: bajo mínimo (RN-52).
    const bajoMinimo = await crearProductoDePrueba({ ...comun, nombre: "Jabón líquido", stockMinimo: 5 });
    const otraCategoria = await crearProductoDePrueba({ categoriaId: bolsas.id, unidadMedidaId: unidad.id, nombre: "Bolsa 30 L", stockMinimo: 2 });
    // Inactivo con stock: sigue apareciendo porque ese stock existe en el almacén.
    const inactivo = await crearProductoDePrueba({ ...comun, nombre: "Balde retirado", stockMinimo: 0 });
    await crearMovimientoDePrueba(inactivo.id);
    await prisma.producto.update({ where: { id: inactivo.id }, data: { activo: false } });

    return { limpieza, bolsas, sobreMinimo, bajoMinimo, otraCategoria, inactivo };
  }

  it("trae los mismos productos que la consulta de existencias, agrupados por categoría (E1, FR-011)", async () => {
    const p = await preparar();

    const reporte = await reporteExistencias({ soloBajoMinimo: false });
    const existencias = await listarExistencias({ estado: "habituales" });

    const filas = reporte.grupos.flatMap((grupo) => grupo.filas);
    expect(filas.map((f) => f.codigo).sort()).toEqual(existencias.productos.map((p2) => p2.codigo).sort());
    expect(reporte.grupos.map((grupo) => grupo.categoria)).toEqual(["Bolsas", "Limpieza"]);
    expect(reporte.grupos[1]?.filas.map((f) => [f.nombre, f.indicador])).toEqual([
      ["Balde retirado", "Inactivo"],
      ["Jabón líquido", "Bajo mínimo"],
      ["Lavandina 1 L", "—"],
    ]);
    expect(filas.find((f) => f.nombre === "Lavandina 1 L")).toMatchObject({ unidad: "Bidón 5 L", stockActual: 1, stockMinimo: 0 });
    expect(reporte.totales).toEqual({ productos: 4, bajoMinimo: 2 });
    expect(p.sobreMinimo.id).toBeGreaterThan(0);
  });

  it("«solo bajo mínimo» deja los activos con stock menor o igual al mínimo (E2, RN-52)", async () => {
    await preparar();

    const reporte = await reporteExistencias({ soloBajoMinimo: true });

    const filas = reporte.grupos.flatMap((grupo) => grupo.filas);
    expect(filas.map((f) => f.nombre).sort()).toEqual(["Bolsa 30 L", "Jabón líquido"]);
    expect(reporte.totales).toEqual({ productos: 2, bajoMinimo: 2 });
  });

  it("filtra por categoría (E3)", async () => {
    const p = await preparar();

    const reporte = await reporteExistencias({ categoriaId: p.bolsas.id, soloBajoMinimo: false });

    expect(reporte.grupos).toHaveLength(1);
    expect(reporte.grupos[0]?.filas.map((f) => f.nombre)).toEqual(["Bolsa 30 L"]);
  });

  it("sin productos devuelve los grupos vacíos y los totales en 0", async () => {
    const reporte = await reporteExistencias({ soloBajoMinimo: false });

    expect(reporte.grupos).toEqual([]);
    expect(reporte.totales).toEqual({ productos: 0, bajoMinimo: 0 });
  });
});
