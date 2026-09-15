// Historia 3 · Kardex de un producto y verificación de consistencia (FR-017, FR-019, FR-020, RN-50, RN-51, RN-53).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { registrarCompra } from "@/servicios/compras";
import { obtenerKardex, verificarConsistenciaInventario } from "@/servicios/inventario";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba, crearProveedorDePrueba } from "../ayudantes/catalogos";
import { crearSalidaDePrueba } from "../ayudantes/inventario";

let factura = 0;
async function comprar(productoId: number, cantidad: number, fecha: string, razonSocial = "Distribuidora Andina") {
  const { usuario } = await crearUsuarioDePrueba();
  const proveedor = await crearProveedorDePrueba({ razonSocial });
  factura += 1;
  return registrarCompra(
    { proveedorId: proveedor.id, nroFactura: String(1000 + factura), fecha, lineas: [{ productoId, cantidad, precioUnitario: "10" }] },
    usuario.id,
  );
}

describe("obtenerKardex", () => {
  beforeEach(vaciarTablas);

  it("lista en orden de registro con documento de origen, y los saldos cuadran (RN-50, RN-51)", async () => {
    const producto = await crearProductoDePrueba();
    const { id: compraId } = await comprar(producto.id, 10, "2026-09-01");
    const { distribucion } = await crearSalidaDePrueba({ productoId: producto.id, cantidad: 3, fecha: "2026-09-02" });

    const kardex = await obtenerKardex(producto.id, {});
    expect(kardex?.movimientos.map((m) => [m.tipo, m.entrada, m.salida, m.saldoResultante])).toEqual([
      ["ENTRADA_COMPRA", 10, null, 10],
      ["SALIDA_DISTRIBUCION", null, 3, 7],
    ]);
    expect(kardex?.movimientos[0]?.documento).toEqual({ ruta: `/compras/${compraId}`, texto: expect.stringMatching(/^Factura \d+ · Distribuidora Andina$/) });
    expect(kardex?.movimientos[1]?.documento).toEqual({
      ruta: `/distribuciones/${distribucion.id}`,
      texto: expect.stringMatching(new RegExp(`^Vale ${distribucion.nroVale} · .+, .+$`)),
    });
    expect(kardex?.movimientos[0]?.fechaDocumento).toBe("2026-09-01");

    // RN-50: el saldo del último movimiento es el stock actual.
    expect(kardex?.movimientos.at(-1)?.saldoResultante).toBe(kardex?.producto.stockActual);
    // RN-51: cada saldo es el anterior más su cantidad.
    let saldo = 0;
    for (const movimiento of kardex!.movimientos) {
      saldo += movimiento.cantidad;
      expect(movimiento.saldoResultante).toBe(saldo);
    }
  });

  it("una compra con fecha pasada registrada después aparece después y no cambia saldos anteriores (Historia 3 · E7)", async () => {
    const producto = await crearProductoDePrueba();
    await comprar(producto.id, 10, "2026-09-01");
    await crearSalidaDePrueba({ productoId: producto.id, cantidad: 3, fecha: "2026-09-12" });
    await comprar(producto.id, 5, "2026-09-02");

    const kardex = await obtenerKardex(producto.id, {});
    expect(kardex?.movimientos.map((m) => [m.fechaDocumento, m.saldoResultante])).toEqual([
      ["2026-09-01", 10],
      ["2026-09-12", 7],
      ["2026-09-02", 12],
    ]);
  });

  it("con rango, filtra por fecha del documento y calcula saldo anterior y final (RN-53)", async () => {
    const producto = await crearProductoDePrueba();
    await comprar(producto.id, 10, "2026-09-01");
    await crearSalidaDePrueba({ productoId: producto.id, cantidad: 3, fecha: "2026-09-12" });
    await comprar(producto.id, 5, "2026-09-02");

    const rango = await obtenerKardex(producto.id, { desde: "2026-09-02", hasta: "2026-09-05" });
    expect(rango?.movimientos.map((m) => m.fechaDocumento)).toEqual(["2026-09-02"]);
    expect(rango).toMatchObject({ saldoAnterior: 10, saldoFinal: 15 });

    // Solo "desde": el saldo final es la suma de todos, igual al stock actual.
    const soloDesde = await obtenerKardex(producto.id, { desde: "2026-09-10" });
    expect(soloDesde?.movimientos.map((m) => m.fechaDocumento)).toEqual(["2026-09-12"]);
    expect(soloDesde).toMatchObject({ saldoAnterior: 15, saldoFinal: 12 });

    // Solo "hasta": el saldo anterior es 0.
    const soloHasta = await obtenerKardex(producto.id, { hasta: "2026-09-01" });
    expect(soloHasta?.movimientos).toHaveLength(1);
    expect(soloHasta).toMatchObject({ saldoAnterior: 0, saldoFinal: 10 });
  });

  it("producto sin movimientos y producto inexistente", async () => {
    const producto = await crearProductoDePrueba();
    expect(await obtenerKardex(producto.id, {})).toMatchObject({ movimientos: [], saldoAnterior: 0, saldoFinal: 0 });
    expect(await obtenerKardex(999, {})).toBeNull();
  });
});

describe("verificarConsistenciaInventario (FR-020, SC-002)", () => {
  beforeEach(vaciarTablas);

  it("informa 0 diferencias tras compras y salidas", async () => {
    const a = await crearProductoDePrueba();
    const b = await crearProductoDePrueba();
    await crearProductoDePrueba();
    await comprar(a.id, 10, "2026-09-01");
    await comprar(b.id, 4, "2026-09-01");
    await crearSalidaDePrueba({ productoId: a.id, cantidad: 6 });

    const resultado = await verificarConsistenciaInventario();
    expect(resultado.revisados).toBe(3);
    expect(resultado.diferencias).toEqual([]);
    expect(resultado.verificadoEn).toBeInstanceOf(Date);
  });

  it("detecta un stock alterado por fuera del kardex", async () => {
    const producto = await crearProductoDePrueba({ codigo: "LIM-001", nombre: "Lavandina 1 L" });
    await comprar(producto.id, 10, "2026-09-01");
    // Solo en la base de pruebas: simula un stock cambiado sin movimiento, lo que el sistema nunca hace.
    await prisma.$executeRaw`UPDATE producto SET stock_actual = stock_actual + 2 WHERE id = ${producto.id}`;

    const resultado = await verificarConsistenciaInventario();
    expect(resultado.diferencias).toEqual([
      { productoId: producto.id, codigo: "LIM-001", nombre: "Lavandina 1 L", stockActual: 12, sumaMovimientos: 10, diferencia: 2 },
    ]);
  });
});
