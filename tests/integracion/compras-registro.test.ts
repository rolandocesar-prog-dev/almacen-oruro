// Historia 1 · Registrar una compra (FR-001 a FR-006, RN-20 a RN-24, SC-003 a SC-005).
import { beforeEach, describe, expect, it } from "vitest";
import type { DatosCompra } from "@/esquemas/compras";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { buscarFacturaVigente, obtenerCompra, registrarCompra } from "@/servicios/compras";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba, crearProveedorDePrueba } from "../ayudantes/catalogos";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

function compra(proveedorId: number, lineas: DatosCompra["lineas"], cambios: Partial<DatosCompra> = {}): DatosCompra {
  return { proveedorId, nroFactura: "1234", fecha: "2026-09-10", observacion: undefined, lineas, ...cambios };
}

describe("registrarCompra", () => {
  beforeEach(vaciarTablas);

  it("guarda cabecera, líneas y un ENTRADA_COMPRA por línea, y suma el stock", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const proveedor = await crearProveedorDePrueba();
    // Uno tras otro: así los ids quedan en el orden a < b < c que usa la comprobación del stock.
    const a = await crearProductoDePrueba();
    const b = await crearProductoDePrueba();
    const c = await crearProductoDePrueba();

    const { id } = await registrarCompra(
      compra(proveedor.id, [
        { productoId: a.id, cantidad: 10, precioUnitario: "12.50" },
        { productoId: b.id, cantidad: 4, precioUnitario: "30" },
        { productoId: c.id, cantidad: 1, precioUnitario: "5.25" },
      ]),
      usuario.id,
    );

    const guardada = await prisma.compra.findUniqueOrThrow({ where: { id }, include: { lineas: true, movimientos: true } });
    expect(guardada.estado).toBe("REGISTRADA");
    expect(guardada.usuarioId).toBe(usuario.id);
    expect(guardada.creadoEn).toBeInstanceOf(Date);
    expect(guardada.lineas).toHaveLength(3);
    expect(guardada.movimientos).toHaveLength(3);
    for (const movimiento of guardada.movimientos) {
      expect(movimiento.tipo).toBe("ENTRADA_COMPRA");
      expect(movimiento.fechaDocumento.toISOString().slice(0, 10)).toBe("2026-09-10");
    }
    const stocks = await prisma.producto.findMany({ where: { id: { in: [a.id, b.id, c.id] } }, orderBy: { id: "asc" } });
    expect(stocks.map((p) => p.stockActual)).toEqual([10, 4, 1]);
  });

  it("calcula subtotales y total en el servidor aunque lleguen otros valores (RN-23)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const proveedor = await crearProveedorDePrueba();
    const a = await crearProductoDePrueba();
    const b = await crearProductoDePrueba();
    const datos = {
      ...compra(proveedor.id, [
        { productoId: a.id, cantidad: 10, precioUnitario: "12.50" },
        { productoId: b.id, cantidad: 4, precioUnitario: "30.00" },
      ]),
      total: 1,
    } as DatosCompra;

    const { id } = await registrarCompra(datos, usuario.id);

    const ficha = await obtenerCompra(id);
    expect(ficha?.total).toBe("245.00");
    expect(ficha?.lineas.map((l) => l.subtotal)).toEqual(["125.00", "120.00"]);
  });

  it("rechaza la factura vigente del mismo proveedor sin cambiar stock, con enlace a la compra", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const proveedorA = await crearProveedorDePrueba();
    const producto = await crearProductoDePrueba();
    const linea = [{ productoId: producto.id, cantidad: 5, precioUnitario: "10" }];
    const { id } = await registrarCompra(compra(proveedorA.id, linea), usuario.id);

    const error = await errorDe(registrarCompra(compra(proveedorA.id, linea), usuario.id));
    expect(error.message).toBe("La factura 1234 ya está registrada para este proveedor");
    expect(error.campo).toBe("nroFactura");
    expect(error.enlace).toEqual({ texto: "Ver compra", ruta: `/compras/${id}` });
    expect((await prisma.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual).toBe(5);
  });

  it("acepta la misma factura de otro proveedor (X-05) y distingue ceros a la izquierda", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const proveedorA = await crearProveedorDePrueba();
    const proveedorB = await crearProveedorDePrueba();
    const producto = await crearProductoDePrueba();
    const linea = [{ productoId: producto.id, cantidad: 1, precioUnitario: "10" }];
    await registrarCompra(compra(proveedorA.id, linea), usuario.id);

    await expect(registrarCompra(compra(proveedorB.id, linea), usuario.id)).resolves.toHaveProperty("id");
    await expect(registrarCompra(compra(proveedorA.id, linea, { nroFactura: "0001234" }), usuario.id)).resolves.toHaveProperty("id");
  });

  it("rechaza un proveedor o un producto inactivos sin guardar nada (RN-14)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const inactivo = await crearProveedorDePrueba({ razonSocial: "Cerrada", activo: false });
    const proveedor = await crearProveedorDePrueba();
    const producto = await crearProductoDePrueba();
    const retirado = await crearProductoDePrueba({ nombre: "Balde viejo", activo: false });

    expect((await errorDe(registrarCompra(compra(inactivo.id, [{ productoId: producto.id, cantidad: 1, precioUnitario: "1" }]), usuario.id))).message).toBe(
      "El proveedor 'Cerrada' está inactivo: elige uno activo",
    );

    const error = await errorDe(
      registrarCompra(
        compra(proveedor.id, [
          { productoId: producto.id, cantidad: 1, precioUnitario: "1" },
          { productoId: retirado.id, cantidad: 1, precioUnitario: "1" },
        ]),
        usuario.id,
      ),
    );
    expect(error.message).toBe("Línea 2: el producto 'Balde viejo' está inactivo: elige uno activo");
    expect(error.campo).toBe("lineas.1.productoId");
    expect(await prisma.compra.count()).toBe(0);
  });

  it("si falla después del primer movimiento no queda compra, línea ni movimiento (RN-20, SC-004)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const proveedor = await crearProveedorDePrueba();
    const a = await crearProductoDePrueba();
    const b = await crearProductoDePrueba();
    // Stock de B en el máximo de la columna entera: sumarle 1 desborda y hace fallar la transacción
    // después de haber escrito el movimiento de A, que tiene el id menor.
    await prisma.$executeRaw`UPDATE producto SET stock_actual = 2147483647 WHERE id = ${b.id}`;

    await expect(
      registrarCompra(
        compra(proveedor.id, [
          { productoId: a.id, cantidad: 1, precioUnitario: "1" },
          { productoId: b.id, cantidad: 1, precioUnitario: "1" },
        ]),
        usuario.id,
      ),
    ).rejects.toThrow();

    expect(await prisma.compra.count()).toBe(0);
    expect(await prisma.compraDetalle.count()).toBe(0);
    expect(await prisma.movimientoInventario.count()).toBe(0);
    expect((await prisma.producto.findUniqueOrThrow({ where: { id: a.id } })).stockActual).toBe(0);
  });

  it("buscarFacturaVigente y obtenerCompra", async () => {
    const { usuario } = await crearUsuarioDePrueba({ nombre: "Ana", apellido: "Rojas" });
    const proveedor = await crearProveedorDePrueba({ razonSocial: "Distribuidora Andina" });
    const producto = await crearProductoDePrueba({ codigo: "LIM-001", nombre: "Lavandina 1 L" });
    const { id } = await registrarCompra(
      compra(proveedor.id, [{ productoId: producto.id, cantidad: 3, precioUnitario: "8.5" }], { fecha: "2026-09-01", observacion: "Entrega parcial" }),
      usuario.id,
    );

    expect(await buscarFacturaVigente(proveedor.id, "1234")).toEqual({ id });
    expect(await buscarFacturaVigente(proveedor.id, "9999")).toBeNull();

    const ficha = await obtenerCompra(id);
    expect(ficha).toMatchObject({
      nroFactura: "1234",
      fecha: "2026-09-01",
      observacion: "Entrega parcial",
      total: "25.50",
      estado: "REGISTRADA",
      proveedor: { razonSocial: "Distribuidora Andina" },
      registradaPor: "Ana Rojas",
    });
    expect(ficha?.lineas[0]).toMatchObject({ codigo: "LIM-001", nombre: "Lavandina 1 L", cantidad: 3, precioUnitario: "8.50", subtotal: "25.50" });
    expect(await obtenerCompra(999)).toBeNull();
  });
});
