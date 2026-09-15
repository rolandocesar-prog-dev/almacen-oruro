// Operaciones simultáneas sobre el stock (FR-016, SC-006, research K-12).
// Cada llamada abre su propia transacción: el bloqueo de fila de registrarMovimiento es lo que se prueba.
import { beforeEach, describe, expect, it } from "vitest";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { registrarCompra } from "@/servicios/compras";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba, crearProveedorDePrueba } from "../ayudantes/catalogos";

describe("compras simultáneas", () => {
  beforeEach(vaciarTablas);

  it("10 compras del mismo producto a la vez: stock 10 y saldos 1…10 sin repetir (RN-50, RN-51)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const proveedor = await crearProveedorDePrueba();
    const producto = await crearProductoDePrueba();

    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        registrarCompra(
          { proveedorId: proveedor.id, nroFactura: String(100 + i), fecha: "2026-09-10", lineas: [{ productoId: producto.id, cantidad: 1, precioUnitario: "10" }] },
          usuario.id,
        ),
      ),
    );

    const movimientos = await prisma.movimientoInventario.findMany({ where: { productoId: producto.id }, orderBy: { id: "asc" } });
    expect(movimientos.map((m) => m.saldoResultante)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect((await prisma.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual).toBe(10);
  });

  it("2 compras con la misma factura y proveedor a la vez: se guarda una sola", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const proveedor = await crearProveedorDePrueba();
    const producto = await crearProductoDePrueba();
    const datos = { proveedorId: proveedor.id, nroFactura: "5555", fecha: "2026-09-10", lineas: [{ productoId: producto.id, cantidad: 3, precioUnitario: "10" }] };

    const resultados = await Promise.allSettled([registrarCompra(datos, usuario.id), registrarCompra(datos, usuario.id)]);

    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rechazo = resultados.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rechazo.reason).toBeInstanceOf(ErrorDeNegocio);
    expect((rechazo.reason as ErrorDeNegocio).message).toBe("La factura 5555 ya está registrada para este proveedor");
    expect(await prisma.compra.count()).toBe(1);
    expect((await prisma.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual).toBe(3);
  });

  it("2 compras con los productos A y B en orden inverso se guardan sin interbloqueo", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const proveedor = await crearProveedorDePrueba();
    const a = await crearProductoDePrueba();
    const b = await crearProductoDePrueba();

    await Promise.all([
      registrarCompra(
        {
          proveedorId: proveedor.id,
          nroFactura: "1",
          fecha: "2026-09-10",
          lineas: [
            { productoId: a.id, cantidad: 1, precioUnitario: "1" },
            { productoId: b.id, cantidad: 1, precioUnitario: "1" },
          ],
        },
        usuario.id,
      ),
      registrarCompra(
        {
          proveedorId: proveedor.id,
          nroFactura: "2",
          fecha: "2026-09-10",
          lineas: [
            { productoId: b.id, cantidad: 2, precioUnitario: "1" },
            { productoId: a.id, cantidad: 2, precioUnitario: "1" },
          ],
        },
        usuario.id,
      ),
    ]);

    const stocks = await prisma.producto.findMany({ where: { id: { in: [a.id, b.id] } } });
    expect(stocks.map((p) => p.stockActual)).toEqual([3, 3]);
  });
});
