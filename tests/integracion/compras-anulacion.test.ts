// Historia 5 · Anular una compra (FR-011 a FR-014, FR-022, RN-25, RN-26, RN-53, SC-002).
import { beforeEach, describe, expect, it } from "vitest";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { anularCompra, registrarCompra } from "@/servicios/compras";
import { verificarConsistenciaInventario } from "@/servicios/inventario";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba, crearProveedorDePrueba } from "../ayudantes/catalogos";
import { crearSalidaDePrueba } from "../ayudantes/inventario";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

async function preparar() {
  const { usuario } = await crearUsuarioDePrueba();
  const proveedor = await crearProveedorDePrueba();
  return { usuario, proveedor };
}

const stockDe = async (id: number) => (await prisma.producto.findUniqueOrThrow({ where: { id } })).stockActual;

describe("anularCompra", () => {
  beforeEach(vaciarTablas);

  it("deja la compra ANULADA, registra movimientos inversos con la fecha de la compra y revierte el stock", async () => {
    const { usuario, proveedor } = await preparar();
    const a = await crearProductoDePrueba();
    const b = await crearProductoDePrueba();
    const { id } = await registrarCompra(
      {
        proveedorId: proveedor.id,
        nroFactura: "1234",
        fecha: "2026-08-15",
        lineas: [
          { productoId: a.id, cantidad: 10, precioUnitario: "1" },
          { productoId: b.id, cantidad: 4, precioUnitario: "1" },
        ],
      },
      usuario.id,
    );

    await expect(anularCompra(id, "Cantidades mal cargadas", usuario.id)).resolves.toEqual({ productoIds: [a.id, b.id] });

    const compra = await prisma.compra.findUniqueOrThrow({ where: { id } });
    expect(compra).toMatchObject({ estado: "ANULADA", motivoAnulacion: "Cantidades mal cargadas", anuladaPorId: usuario.id });
    expect(compra.anuladaEn).toBeInstanceOf(Date);

    const anulaciones = await prisma.movimientoInventario.findMany({ where: { compraId: id, tipo: "ANULACION_COMPRA" }, orderBy: { id: "asc" } });
    expect(anulaciones.map((m) => [m.productoId, m.cantidad])).toEqual([
      [a.id, -10],
      [b.id, -4],
    ]);
    // RN-53: la anulación lleva la fecha del documento anulado, aunque se registre hoy.
    expect(anulaciones.every((m) => m.fechaDocumento.toISOString().startsWith("2026-08-15"))).toBe(true);
    expect([await stockDe(a.id), await stockDe(b.id)]).toEqual([0, 0]);
  });

  it("rechaza si el stock ya se distribuyó, indicando cuánto falta, y no cambia nada (RN-25)", async () => {
    const { usuario, proveedor } = await preparar();
    const producto = await crearProductoDePrueba({ nombre: "Lavandina 1 L" });
    const { id } = await registrarCompra(
      { proveedorId: proveedor.id, nroFactura: "1", fecha: "2026-09-01", lineas: [{ productoId: producto.id, cantidad: 10, precioUnitario: "1" }] },
      usuario.id,
    );
    await crearSalidaDePrueba({ productoId: producto.id, cantidad: 7 });

    expect((await errorDe(anularCompra(id, "Error", usuario.id))).message).toBe(
      "No se puede anular: faltan 7 unidades de 'Lavandina 1 L' (stock actual 3, a revertir 10)",
    );
    expect((await prisma.compra.findUniqueOrThrow({ where: { id } })).estado).toBe("REGISTRADA");
    expect(await stockDe(producto.id)).toBe(3);
    expect(await prisma.movimientoInventario.count({ where: { tipo: "ANULACION_COMPRA" } })).toBe(0);
  });

  it("lista todos los productos con faltante, usa singular con 1 unidad, y no anula ninguna línea", async () => {
    const { usuario, proveedor } = await preparar();
    const a = await crearProductoDePrueba({ nombre: "Balde" });
    const b = await crearProductoDePrueba({ nombre: "Escoba" });
    const c = await crearProductoDePrueba({ nombre: "Trapeador" });
    const { id } = await registrarCompra(
      {
        proveedorId: proveedor.id,
        nroFactura: "2",
        fecha: "2026-09-01",
        lineas: [
          { productoId: a.id, cantidad: 5, precioUnitario: "1" },
          { productoId: b.id, cantidad: 5, precioUnitario: "1" },
          { productoId: c.id, cantidad: 5, precioUnitario: "1" },
        ],
      },
      usuario.id,
    );
    await crearSalidaDePrueba({ productoId: a.id, cantidad: 1 });
    await crearSalidaDePrueba({ productoId: b.id, cantidad: 3 });

    expect((await errorDe(anularCompra(id, "Error", usuario.id))).message).toBe(
      "No se puede anular: falta 1 unidad de 'Balde' (stock actual 4, a revertir 5); faltan 3 unidades de 'Escoba' (stock actual 2, a revertir 5)",
    );
    expect([await stockDe(a.id), await stockDe(b.id), await stockDe(c.id)]).toEqual([4, 2, 5]);
  });

  it("no anula dos veces, informa una compra inexistente y libera la factura (RN-26)", async () => {
    const { usuario, proveedor } = await preparar();
    const producto = await crearProductoDePrueba();
    const datos = { proveedorId: proveedor.id, nroFactura: "1234", fecha: "2026-09-01", lineas: [{ productoId: producto.id, cantidad: 2, precioUnitario: "1" }] };
    const { id } = await registrarCompra(datos, usuario.id);

    await anularCompra(id, "Error", usuario.id);
    expect((await errorDe(anularCompra(id, "Otra vez", usuario.id))).message).toBe("La compra ya está anulada");
    expect((await errorDe(anularCompra(999, "Error", usuario.id))).message).toBe("No existe la compra indicada");

    await expect(registrarCompra(datos, usuario.id)).resolves.toHaveProperty("id");
  });

  it("permite anular con el proveedor y el producto ya desactivados", async () => {
    const { usuario, proveedor } = await preparar();
    const producto = await crearProductoDePrueba();
    const { id } = await registrarCompra(
      { proveedorId: proveedor.id, nroFactura: "3", fecha: "2026-09-01", lineas: [{ productoId: producto.id, cantidad: 2, precioUnitario: "1" }] },
      usuario.id,
    );
    await prisma.proveedor.update({ where: { id: proveedor.id }, data: { activo: false } });
    await prisma.producto.update({ where: { id: producto.id }, data: { activo: false } });

    await expect(anularCompra(id, "Error", usuario.id)).resolves.toEqual({ productoIds: [producto.id] });
  });

  it("dos anulaciones simultáneas de la misma compra revierten el stock una sola vez", async () => {
    const { usuario, proveedor } = await preparar();
    const producto = await crearProductoDePrueba();
    const { id } = await registrarCompra(
      { proveedorId: proveedor.id, nroFactura: "4", fecha: "2026-09-01", lineas: [{ productoId: producto.id, cantidad: 6, precioUnitario: "1" }] },
      usuario.id,
    );
    await registrarCompra(
      { proveedorId: proveedor.id, nroFactura: "5", fecha: "2026-09-01", lineas: [{ productoId: producto.id, cantidad: 6, precioUnitario: "1" }] },
      usuario.id,
    );

    const resultados = await Promise.allSettled([anularCompra(id, "Primera", usuario.id), anularCompra(id, "Segunda", usuario.id)]);

    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rechazo = resultados.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect((rechazo.reason as ErrorDeNegocio).message).toBe("La compra ya está anulada");
    expect(await stockDe(producto.id)).toBe(6);
  });

  it("una anulación y una salida simultáneas nunca dejan stock negativo: solo una se completa", async () => {
    const { usuario, proveedor } = await preparar();
    const producto = await crearProductoDePrueba();
    const { id } = await registrarCompra(
      { proveedorId: proveedor.id, nroFactura: "6", fecha: "2026-09-01", lineas: [{ productoId: producto.id, cantidad: 10, precioUnitario: "1" }] },
      usuario.id,
    );

    const resultados = await Promise.allSettled([anularCompra(id, "Error", usuario.id), crearSalidaDePrueba({ productoId: producto.id, cantidad: 5 })]);

    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rechazo = resultados.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rechazo.reason).toBeInstanceOf(ErrorDeNegocio);
    expect([0, 5]).toContain(await stockDe(producto.id));
  });

  it("tras compras y anulaciones el inventario sigue consistente (SC-002)", async () => {
    const { usuario, proveedor } = await preparar();
    const a = await crearProductoDePrueba();
    const b = await crearProductoDePrueba();
    const primera = await registrarCompra(
      { proveedorId: proveedor.id, nroFactura: "7", fecha: "2026-09-01", lineas: [{ productoId: a.id, cantidad: 8, precioUnitario: "1" }] },
      usuario.id,
    );
    await registrarCompra(
      {
        proveedorId: proveedor.id,
        nroFactura: "8",
        fecha: "2026-09-02",
        lineas: [
          { productoId: a.id, cantidad: 2, precioUnitario: "1" },
          { productoId: b.id, cantidad: 3, precioUnitario: "1" },
        ],
      },
      usuario.id,
    );
    await anularCompra(primera.id, "Error", usuario.id);

    expect((await verificarConsistenciaInventario()).diferencias).toEqual([]);
    expect([await stockDe(a.id), await stockDe(b.id)]).toEqual([2, 3]);
  });
});
