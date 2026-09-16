// Historia 4 · Reporte de kardex R-4 (FR-012, RN-51, RN-53, SC-002).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { anularCompra, registrarCompra } from "@/servicios/compras";
import { reporteKardex } from "@/servicios/reportes";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba, crearProveedorDePrueba } from "../ayudantes/catalogos";
import { crearSalidaDePrueba } from "../ayudantes/inventario";

describe("reporteKardex", () => {
  beforeEach(vaciarTablas);

  async function preparar() {
    const { usuario } = await crearUsuarioDePrueba();
    const proveedor = await crearProveedorDePrueba();
    const producto = await crearProductoDePrueba({ nombre: "Lavandina 1 L" });
    const comprar = (nroFactura: string, fecha: string, cantidad: number) =>
      registrarCompra({ proveedorId: proveedor.id, nroFactura, fecha, lineas: [{ productoId: producto.id, cantidad, precioUnitario: "10" }] }, usuario.id);

    // Antes del rango: 10 unidades.
    await comprar("1", "2026-08-20", 10);
    // Dentro del rango: +5, −3 y la anulación de una compra de 2.
    await comprar("2", "2026-09-03", 5);
    await crearSalidaDePrueba({ productoId: producto.id, cantidad: 3, fecha: "2026-09-05" });
    const anulable = await comprar("3", "2026-09-07", 2);
    await anularCompra(anulable.id, "Cargada por error", usuario.id);
    return { usuario, producto };
  }

  it("trae saldo inicial, los movimientos del rango y el saldo final (E1, RN-53)", async () => {
    const { producto } = await preparar();

    const reporte = await reporteKardex(producto.id, { desde: "2026-09-01", hasta: "2026-09-30" });

    expect(reporte?.producto).toMatchObject({ id: producto.id, nombre: "Lavandina 1 L" });
    expect(reporte?.saldoInicial).toBe(10);
    expect(reporte?.movimientos.map((m) => [m.fechaDocumento, m.tipo, m.entrada, m.salida, m.saldoResultante])).toEqual([
      ["2026-09-03", "ENTRADA_COMPRA", 5, null, 15],
      ["2026-09-05", "SALIDA_DISTRIBUCION", null, 3, 12],
      ["2026-09-07", "ENTRADA_COMPRA", 2, null, 14],
      // La anulación lleva la fecha del documento anulado (RN-53) y aparece siempre (E4).
      ["2026-09-07", "ANULACION_COMPRA", null, 2, 12],
    ]);
    expect(reporte?.movimientos[0]?.documento?.texto).toEqual(expect.stringContaining("Factura"));
    expect(reporte?.saldoFinal).toBe(12);
  });

  it("con el rango hasta hoy, el saldo final es el stock actual (E2, SC-002)", async () => {
    const { producto } = await preparar();

    const reporte = await reporteKardex(producto.id, { desde: "2026-08-01", hasta: "2026-12-31" });

    const stockActual = (await prisma.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual;
    expect(reporte?.saldoFinal).toBe(stockActual);
    expect(reporte?.saldoInicial).toBe(0);
  });

  it("un producto sin movimientos en el rango trae la lista vacía y los saldos iguales (caso borde)", async () => {
    const { producto } = await preparar();

    const reporte = await reporteKardex(producto.id, { desde: "2026-10-01", hasta: "2026-10-31" });

    expect(reporte?.movimientos).toEqual([]);
    expect(reporte?.saldoInicial).toBe(12);
    expect(reporte?.saldoFinal).toBe(12);
  });

  it("un producto inexistente devuelve null", async () => {
    expect(await reporteKardex(999_999, { desde: "2026-09-01", hasta: "2026-09-30" })).toBeNull();
  });
});
