// Historia 6 · Productos que ofrece cada proveedor (FR-025, FR-026, RN-11, RN-14).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ErrorDeNegocio } from "@/lib/errores";
import { obtenerProducto } from "@/servicios/catalogos/productos";
import {
  asociarProducto,
  cambiarPrecioReferencial,
  desactivarAsociacion,
  reactivarAsociacion,
} from "@/servicios/catalogos/proveedor-producto";
import { obtenerProveedor } from "@/servicios/catalogos/proveedores";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba, crearProveedorDePrueba } from "../ayudantes/catalogos";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

describe("asociar productos a un proveedor", () => {
  beforeEach(vaciarTablas);

  it("guarda el precio referencial como decimal exacto", async () => {
    const proveedor = await crearProveedorDePrueba();
    const producto = await crearProductoDePrueba();

    const { asociacionId } = await asociarProducto(proveedor.id, { productoId: producto.id, precioReferencial: "12.50" });
    const guardada = await prisma.proveedorProducto.findUniqueOrThrow({ where: { id: asociacionId } });
    expect(guardada.precioReferencial?.toFixed(2)).toBe("12.50");
    expect(guardada.activo).toBe(true);
  });

  it("no repite el par proveedor–producto y avisa si estaba inactivo", async () => {
    const proveedor = await crearProveedorDePrueba();
    const producto = await crearProductoDePrueba({ nombre: "Lavandina 1 L" });
    const { asociacionId } = await asociarProducto(proveedor.id, { productoId: producto.id });

    const repetido = await errorDe(asociarProducto(proveedor.id, { productoId: producto.id }));
    expect(repetido.message).toBe("Este proveedor ya ofrece 'Lavandina 1 L'");
    expect(repetido.campo).toBe("productoId");

    await desactivarAsociacion(asociacionId);
    expect((await errorDe(asociarProducto(proveedor.id, { productoId: producto.id }))).message).toBe(
      "Este proveedor ya tenía 'Lavandina 1 L' como inactivo: reactívalo en la lista",
    );
  });

  it("rechaza un proveedor o un producto inactivos (RN-14)", async () => {
    const proveedorInactivo = await crearProveedorDePrueba({ razonSocial: "Cerrada", activo: false });
    const productoActivo = await crearProductoDePrueba();
    expect((await errorDe(asociarProducto(proveedorInactivo.id, { productoId: productoActivo.id }))).message).toBe(
      "El proveedor 'Cerrada' está inactivo: reactívalo para agregarle productos",
    );

    const proveedor = await crearProveedorDePrueba();
    const productoInactivo = await crearProductoDePrueba({ nombre: "Viejo", activo: false });
    expect((await errorDe(asociarProducto(proveedor.id, { productoId: productoInactivo.id }))).message).toBe(
      "El producto 'Viejo' está inactivo: elige uno activo",
    );
  });
});

describe("mantener las asociaciones", () => {
  beforeEach(vaciarTablas);

  it("cambia el precio y lo deja sin precio si llega vacío", async () => {
    const proveedor = await crearProveedorDePrueba();
    const producto = await crearProductoDePrueba();
    const { asociacionId } = await asociarProducto(proveedor.id, { productoId: producto.id, precioReferencial: "10" });

    await cambiarPrecioReferencial(asociacionId, "8.75");
    expect((await prisma.proveedorProducto.findUniqueOrThrow({ where: { id: asociacionId } })).precioReferencial?.toFixed(2)).toBe("8.75");

    await cambiarPrecioReferencial(asociacionId, undefined);
    expect((await prisma.proveedorProducto.findUniqueOrThrow({ where: { id: asociacionId } })).precioReferencial).toBeNull();

    expect((await errorDe(cambiarPrecioReferencial(999, "5"))).message).toBe("No existe la asociación indicada");
  });

  it("desactiva y reactiva, pero no reactiva si el producto está inactivo", async () => {
    const proveedor = await crearProveedorDePrueba();
    const producto = await crearProductoDePrueba({ nombre: "Lavandina 1 L" });
    const { asociacionId } = await asociarProducto(proveedor.id, { productoId: producto.id });

    await desactivarAsociacion(asociacionId);
    expect((await errorDe(desactivarAsociacion(asociacionId))).message).toBe("La asociación ya está inactiva");
    await reactivarAsociacion(asociacionId);
    expect((await prisma.proveedorProducto.findUniqueOrThrow({ where: { id: asociacionId } })).activo).toBe(true);

    await desactivarAsociacion(asociacionId);
    await prisma.producto.update({ where: { id: producto.id }, data: { activo: false } });
    expect((await errorDe(reactivarAsociacion(asociacionId))).message).toBe("No se puede reactivar: el producto 'Lavandina 1 L' está inactivo");
  });

  it("la ficha del proveedor lista activas o inactivas según el filtro", async () => {
    const proveedor = await crearProveedorDePrueba();
    const activo = await crearProductoDePrueba({ nombre: "Balde" });
    const retirado = await crearProductoDePrueba({ nombre: "Escoba" });
    await asociarProducto(proveedor.id, { productoId: activo.id, precioReferencial: "15" });
    const { asociacionId } = await asociarProducto(proveedor.id, { productoId: retirado.id });
    await desactivarAsociacion(asociacionId);

    const activas = await obtenerProveedor(proveedor.id, { asociaciones: "activas" });
    expect(activas?.productos.map((p) => [p.nombre, p.precioReferencial])).toEqual([["Balde", "15.00"]]);
    const inactivas = await obtenerProveedor(proveedor.id, { asociaciones: "inactivas" });
    expect(inactivas?.productos.map((p) => p.nombre)).toEqual(["Escoba"]);
  });

  it("la ficha del producto muestra solo proveedores activos con asociación activa y su precio (FR-026)", async () => {
    const producto = await crearProductoDePrueba();
    const andina = await crearProveedorDePrueba({ razonSocial: "Andina" });
    const cerrada = await crearProveedorDePrueba({ razonSocial: "Cerrada" });
    const retirada = await crearProveedorDePrueba({ razonSocial: "Retirada" });
    await asociarProducto(andina.id, { productoId: producto.id, precioReferencial: "12.5" });
    await asociarProducto(cerrada.id, { productoId: producto.id });
    const { asociacionId } = await asociarProducto(retirada.id, { productoId: producto.id });
    await prisma.proveedor.update({ where: { id: cerrada.id }, data: { activo: false } });
    await desactivarAsociacion(asociacionId);

    const ficha = await obtenerProducto(producto.id);
    expect(ficha?.proveedores).toEqual([
      expect.objectContaining({ proveedorId: andina.id, razonSocial: "Andina", precioReferencial: "12.50" }),
    ]);
  });
});
