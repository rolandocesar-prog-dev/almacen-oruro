// Núcleo del stock: registrarMovimiento y bloquearProductos (FR-015 a FR-017, principio III, research K-01).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ErrorDeNegocio } from "@/lib/errores";
import { bloquearProductos, registrarMovimiento } from "@/servicios/inventario";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba } from "../ayudantes/catalogos";
import { crearCompraSinMovimientosDePrueba, crearDistribucionSinMovimientosDePrueba } from "../ayudantes/inventario";

async function entrada(productoId: number, cantidad: number) {
  const { compra, usuario } = await crearCompraSinMovimientosDePrueba({ productoId, cantidad });
  return prisma.$transaction((tx) =>
    registrarMovimiento(tx, { productoId, tipo: "ENTRADA_COMPRA", cantidad, fechaDocumento: compra.fecha, compraId: compra.id, usuarioId: usuario.id }),
  );
}

describe("registrarMovimiento", () => {
  beforeEach(vaciarTablas);

  it("inserta el movimiento con su saldo y deja el stock igual al saldo", async () => {
    const producto = await crearProductoDePrueba();

    await expect(entrada(producto.id, 12)).resolves.toEqual({ saldoResultante: 12 });

    const movimiento = await prisma.movimientoInventario.findFirstOrThrow({ where: { productoId: producto.id } });
    expect(movimiento).toMatchObject({ tipo: "ENTRADA_COMPRA", cantidad: 12, saldoResultante: 12 });
    expect((await prisma.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual).toBe(12);
  });

  it("encadena los saldos: cada saldo es el anterior más su cantidad (RN-51)", async () => {
    const producto = await crearProductoDePrueba();
    await entrada(producto.id, 5);
    await entrada(producto.id, 3);

    const movimientos = await prisma.movimientoInventario.findMany({ where: { productoId: producto.id }, orderBy: { id: "asc" } });
    expect(movimientos.map((m) => m.saldoResultante)).toEqual([5, 8]);
  });

  it("rechaza una salida mayor que el stock sin escribir nada", async () => {
    const producto = await crearProductoDePrueba({ nombre: "Lavandina 1 L" });
    await entrada(producto.id, 3);
    const { distribucion, usuario } = await crearDistribucionSinMovimientosDePrueba({ productoId: producto.id, cantidad: 5 });

    const error = await prisma
      .$transaction((tx) =>
        registrarMovimiento(tx, {
          productoId: producto.id,
          tipo: "SALIDA_DISTRIBUCION",
          cantidad: -5,
          fechaDocumento: distribucion.fecha,
          distribucionId: distribucion.id,
          usuarioId: usuario.id,
        }),
      )
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorDeNegocio);
    expect((error as ErrorDeNegocio).message).toBe("Stock insuficiente de 'Lavandina 1 L': hay 3 y se necesitan 5");
    expect(await prisma.movimientoInventario.count({ where: { productoId: producto.id } })).toBe(1);
    expect((await prisma.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual).toBe(3);
  });

  it("si la transacción falla después del movimiento, no queda ni el movimiento ni el cambio de stock", async () => {
    const producto = await crearProductoDePrueba();
    const { compra, usuario } = await crearCompraSinMovimientosDePrueba({ productoId: producto.id, cantidad: 4 });

    await expect(
      prisma.$transaction(async (tx) => {
        await registrarMovimiento(tx, {
          productoId: producto.id,
          tipo: "ENTRADA_COMPRA",
          cantidad: 4,
          fechaDocumento: compra.fecha,
          compraId: compra.id,
          usuarioId: usuario.id,
        });
        throw new Error("falla provocada");
      }),
    ).rejects.toThrow("falla provocada");

    expect(await prisma.movimientoInventario.count()).toBe(0);
    expect((await prisma.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual).toBe(0);
  });
});

describe("bloquearProductos", () => {
  beforeEach(vaciarTablas);

  it("devuelve código, nombre y stock de cada producto pedido", async () => {
    const a = await crearProductoDePrueba({ codigo: "LIM-001", nombre: "Lavandina 1 L" });
    const b = await crearProductoDePrueba({ codigo: "LIM-002", nombre: "Jabón líquido" });
    await entrada(b.id, 7);

    const productos = await prisma.$transaction((tx) => bloquearProductos(tx, [b.id, a.id]));
    expect(productos.get(a.id)).toEqual({ codigo: "LIM-001", nombre: "Lavandina 1 L", stockActual: 0 });
    expect(productos.get(b.id)).toEqual({ codigo: "LIM-002", nombre: "Jabón líquido", stockActual: 7 });
  });

  it("indica si algún producto no existe", async () => {
    const error = await prisma.$transaction((tx) => bloquearProductos(tx, [999])).catch((e: unknown) => e);
    expect((error as ErrorDeNegocio).message).toBe("No existe el producto indicado");
  });
});
