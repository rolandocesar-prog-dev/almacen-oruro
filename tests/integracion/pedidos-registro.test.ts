// Historia 1 · Registrar un pedido (FR-001 a FR-005, FR-007, RN-40, SC-003, SC-005).
import { beforeEach, describe, expect, it } from "vitest";
import type { DatosPedido } from "@/esquemas/pedidos";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { registrarCompra } from "@/servicios/compras";
import { listarProductosParaPedido, obtenerPedido, registrarPedido } from "@/servicios/pedidos";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba, crearProveedorDePrueba, crearRepresentanteDePrueba } from "../ayudantes/catalogos";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

function pedido(representanteId: number, lineas: DatosPedido["lineas"], cambios: Partial<DatosPedido> = {}): DatosPedido {
  return { representanteId, fecha: "2026-09-10", observacion: undefined, lineas, ...cambios };
}

/** Deja `cantidad` unidades de stock con una compra real: el stock solo cambia por el kardex (principio III). */
async function darStock(productoId: number, cantidad: number) {
  const { usuario } = await crearUsuarioDePrueba();
  const proveedor = await crearProveedorDePrueba();
  await registrarCompra({ proveedorId: proveedor.id, nroFactura: String(productoId), fecha: "2026-09-01", lineas: [{ productoId, cantidad, precioUnitario: "10" }] }, usuario.id);
}

async function fotoDelStock() {
  const productos = await prisma.producto.findMany({ select: { id: true, stockActual: true }, orderBy: { id: "asc" } });
  return { productos, movimientos: await prisma.movimientoInventario.count() };
}

describe("registrarPedido", () => {
  beforeEach(vaciarTablas);

  it("guarda el pedido PENDIENTE con número, 3 líneas en 0 y quién lo registró, sin tocar el stock (E1, SC-003)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const representante = await crearRepresentanteDePrueba();
    const [a, b, c] = [await crearProductoDePrueba(), await crearProductoDePrueba(), await crearProductoDePrueba()];
    await darStock(a.id, 20);
    const antes = await fotoDelStock();

    const { id } = await registrarPedido(
      pedido(representante.id, [
        { productoId: a.id, cantidadSolicitada: 10 },
        { productoId: b.id, cantidadSolicitada: 3 },
        { productoId: c.id, cantidadSolicitada: 1 },
      ], { observacion: "Para la semana" }),
      usuario.id,
    );

    const guardado = await prisma.pedido.findUniqueOrThrow({ where: { id }, include: { lineas: { orderBy: { id: "asc" } } } });
    expect(id).toBeGreaterThan(0);
    expect(guardado.estado).toBe("PENDIENTE");
    expect(guardado.usuarioId).toBe(usuario.id);
    expect(guardado.creadoEn).toBeInstanceOf(Date);
    expect(guardado.observacion).toBe("Para la semana");
    expect(guardado.lineas.map((l) => [l.productoId, l.cantidadSolicitada, l.cantidadEntregada])).toEqual([
      [a.id, 10, 0],
      [b.id, 3, 0],
      [c.id, 1, 0],
    ]);
    expect(await fotoDelStock()).toEqual(antes);
  });

  it("acepta pedir más de lo que hay en stock (E7, FR-005)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const representante = await crearRepresentanteDePrueba();
    const producto = await crearProductoDePrueba();
    await darStock(producto.id, 4);

    const { id } = await registrarPedido(pedido(representante.id, [{ productoId: producto.id, cantidadSolicitada: 10 }]), usuario.id);

    expect((await prisma.pedidoDetalle.findFirstOrThrow({ where: { pedidoId: id } })).cantidadSolicitada).toBe(10);
    expect((await prisma.producto.findUniqueOrThrow({ where: { id: producto.id } })).stockActual).toBe(4);
  });

  it("rechaza un representante inactivo (RN-14)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const representante = await crearRepresentanteDePrueba({ nombre: "Ana", apellido: "Quispe", activo: false });
    const producto = await crearProductoDePrueba();

    const error = await errorDe(registrarPedido(pedido(representante.id, [{ productoId: producto.id, cantidadSolicitada: 1 }]), usuario.id));
    expect(error.message).toBe("El representante 'Quispe, Ana' está inactivo: elige uno activo");
    expect(error.campo).toBe("representanteId");
  });

  it("rechaza un producto inactivo indicando la línea y no guarda nada (E8, SC-005)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const representante = await crearRepresentanteDePrueba();
    const activo = await crearProductoDePrueba();
    const inactivo = await crearProductoDePrueba({ nombre: "Cera líquida", activo: false });

    const error = await errorDe(
      registrarPedido(
        pedido(representante.id, [
          { productoId: activo.id, cantidadSolicitada: 1 },
          { productoId: inactivo.id, cantidadSolicitada: 2 },
        ]),
        usuario.id,
      ),
    );
    expect(error.message).toBe("Línea 2: el producto 'Cera líquida' está inactivo: elige uno activo");
    expect(error.campo).toBe("lineas.1.productoId");
    expect(await prisma.pedido.count()).toBe(0);
    expect(await prisma.pedidoDetalle.count()).toBe(0);
  });
});

describe("consultas del registro", () => {
  beforeEach(vaciarTablas);

  it("listarProductosParaPedido devuelve solo activos con su stock y abreviatura", async () => {
    const activo = await crearProductoDePrueba({ codigo: "LIM-001", nombre: "Lavandina 1 L" });
    await crearProductoDePrueba({ activo: false });
    await darStock(activo.id, 7);

    const productos = await listarProductosParaPedido();
    const unidad = await prisma.unidadMedida.findFirstOrThrow({ where: { productos: { some: { id: activo.id } } } });
    expect(productos).toEqual([{ id: activo.id, etiqueta: "LIM-001 · Lavandina 1 L", stockActual: 7, abreviatura: unidad.abreviatura }]);
  });

  it("obtenerPedido trae cabecera, representante con servicio, registrado por y líneas con pendiente", async () => {
    const { usuario } = await crearUsuarioDePrueba({ nombre: "Rosa", apellido: "Mamani" });
    const representante = await crearRepresentanteDePrueba({ nombre: "Ana", apellido: "Quispe", servicio: "Emergencias" });
    const producto = await crearProductoDePrueba({ codigo: "LIM-002", nombre: "Detergente" });
    const { id } = await registrarPedido(pedido(representante.id, [{ productoId: producto.id, cantidadSolicitada: 8 }]), usuario.id);

    const detalle = await obtenerPedido(id);
    expect(detalle).toMatchObject({
      id,
      fecha: "2026-09-10",
      observacion: null,
      estado: "PENDIENTE",
      representante: { id: representante.id, nombre: "Ana", apellido: "Quispe", servicio: "Emergencias", activo: true },
      registradoPor: "Rosa Mamani",
    });
    expect(detalle?.representante.centroSalud).toEqual(expect.any(String));
    expect(detalle?.registradoEn).toBeInstanceOf(Date);
    expect(detalle?.lineas).toEqual([
      expect.objectContaining({ productoId: producto.id, codigo: "LIM-002", nombre: "Detergente", solicitada: 8, entregada: 0, pendiente: 8 }),
    ]);
    expect(await obtenerPedido(999_999)).toBeNull();
  });
});
