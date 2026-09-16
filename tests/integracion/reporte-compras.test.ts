// Historia 1 · Reporte de compras R-1 (FR-009, FR-003, SC-001).
import { beforeEach, describe, expect, it } from "vitest";
import { anularCompra, registrarCompra } from "@/servicios/compras";
import { FILAS_POR_PAGINA_REPORTE, reporteCompras } from "@/servicios/reportes";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba, crearProveedorDePrueba } from "../ayudantes/catalogos";

const rango = { desde: "2026-09-01", hasta: "2026-09-30", incluirAnulados: false, pagina: 1 };

describe("reporteCompras", () => {
  beforeEach(vaciarTablas);

  async function preparar() {
    const { usuario } = await crearUsuarioDePrueba();
    const andina = await crearProveedorDePrueba({ razonSocial: "Distribuidora Andina" });
    const quimica = await crearProveedorDePrueba({ razonSocial: "Química Oruro" });
    const producto = await crearProductoDePrueba();
    const otro = await crearProductoDePrueba();
    const comprar = (proveedorId: number, nroFactura: string, fecha: string, precio: string, lineas = 1) =>
      registrarCompra(
        {
          proveedorId,
          nroFactura,
          fecha,
          lineas: [
            { productoId: producto.id, cantidad: 1, precioUnitario: precio },
            ...(lineas > 1 ? [{ productoId: otro.id, cantidad: 1, precioUnitario: "0.01" }] : []),
          ],
        },
        usuario.id,
      );

    const primera = await comprar(andina.id, "1", "2026-09-02", "100.00");
    const segunda = await comprar(quimica.id, "2", "2026-09-05", "250.50");
    const tercera = await comprar(andina.id, "3", "2026-09-10", "49.50");
    const anulada = await comprar(andina.id, "4", "2026-09-12", "500.00");
    await anularCompra(anulada.id, "Cargada por error", usuario.id);
    const mesAnterior = await comprar(andina.id, "5", "2026-08-20", "999.00");
    return { usuario, andina, quimica, primera, segunda, tercera, anulada, mesAnterior };
  }

  it("lista las compras vigentes del rango ordenadas por fecha, con sus totales (E1, SC-001)", async () => {
    const { andina, primera, segunda, tercera } = await preparar();

    const reporte = await reporteCompras(rango);

    expect(reporte.filas.map((f) => f.id)).toEqual([primera.id, segunda.id, tercera.id]);
    expect(reporte.filas[0]).toEqual({
      id: primera.id,
      fecha: "2026-09-02",
      nroFactura: "1",
      proveedor: "Distribuidora Andina",
      items: 1,
      total: "100.00",
      estado: "REGISTRADA",
    });
    expect(reporte.totales).toEqual({ totalGastado: "400.00", compras: 3 });
    expect(andina.id).toBeGreaterThan(0);
  });

  it("con «incluir anuladas» la anulada aparece marcada y los totales no cambian (E2, FR-003)", async () => {
    const { anulada } = await preparar();

    const reporte = await reporteCompras({ ...rango, incluirAnulados: true });

    expect(reporte.filas).toHaveLength(4);
    expect(reporte.filas.find((f) => f.id === anulada.id)?.estado).toBe("ANULADA");
    expect(reporte.totales).toEqual({ totalGastado: "400.00", compras: 3 });
  });

  it("filtra por proveedor y recalcula los totales (E3)", async () => {
    const { andina, primera, tercera } = await preparar();

    const reporte = await reporteCompras({ ...rango, proveedorId: andina.id });

    expect(reporte.filas.map((f) => f.id)).toEqual([primera.id, tercera.id]);
    expect(reporte.totales).toEqual({ totalGastado: "149.50", compras: 2 });
  });

  it("deja fuera del rango la compra del mes anterior (RN-53)", async () => {
    const { mesAnterior } = await preparar();

    const reporte = await reporteCompras({ ...rango, desde: "2026-08-01", hasta: "2026-08-31" });

    expect(reporte.filas.map((f) => f.id)).toEqual([mesAnterior.id]);
    expect(reporte.totales).toEqual({ totalGastado: "999.00", compras: 1 });
  });

  it("un rango sin compras devuelve la lista vacía y los totales en 0", async () => {
    await preparar();

    const futuro = await reporteCompras({ ...rango, desde: "2027-01-01", hasta: "2027-01-31" });

    expect(futuro.filas).toEqual([]);
    expect(futuro.total).toBe(0);
    expect(futuro.totales).toEqual({ totalGastado: "0.00", compras: 0 });
  });

  it("pagina en pantalla y devuelve todo con «todas» (research E-04)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const proveedor = await crearProveedorDePrueba();
    const producto = await crearProductoDePrueba();
    for (let i = 0; i < FILAS_POR_PAGINA_REPORTE + 1; i += 1) {
      await registrarCompra(
        { proveedorId: proveedor.id, nroFactura: String(1000 + i), fecha: "2026-09-03", lineas: [{ productoId: producto.id, cantidad: 1, precioUnitario: "1" }] },
        usuario.id,
      );
    }

    const primera = await reporteCompras(rango);
    const segunda = await reporteCompras({ ...rango, pagina: 2 });
    const todas = await reporteCompras({ ...rango, todas: true });

    expect(primera.total).toBe(FILAS_POR_PAGINA_REPORTE + 1);
    expect(primera.filas).toHaveLength(FILAS_POR_PAGINA_REPORTE);
    expect(segunda.filas).toHaveLength(1);
    expect(todas.filas).toHaveLength(FILAS_POR_PAGINA_REPORTE + 1);
  });
});
