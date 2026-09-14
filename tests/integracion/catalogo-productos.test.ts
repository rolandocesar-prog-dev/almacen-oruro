// Historia 2 · Productos (FR-006, FR-012, RN-11, RN-13 a RN-17, RN-52).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ErrorDeNegocio } from "@/lib/errores";
import type { DatosProducto } from "@/esquemas/catalogos/producto";
import {
  desactivarProducto,
  listarProductos,
  listarProductosParaSelector,
  modificarProducto,
  obtenerProducto,
  reactivarProducto,
  registrarProducto,
} from "@/servicios/catalogos/productos";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import {
  crearCategoriaDePrueba,
  crearMovimientoDePrueba,
  crearPedidoConSaldo,
  crearProductoDePrueba,
  crearRepresentanteDePrueba,
  crearUnidadDePrueba,
} from "../ayudantes/catalogos";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

async function datosDeProducto(cambios: Partial<DatosProducto> = {}): Promise<DatosProducto> {
  const categoriaId = cambios.categoriaId ?? (await crearCategoriaDePrueba()).id;
  const unidadMedidaId = cambios.unidadMedidaId ?? (await crearUnidadDePrueba({ nombre: `Bidón ${categoriaId}` })).id;
  return { codigo: "LIM-001", nombre: "Lavandina 1 L", stockMinimo: 5, ...cambios, categoriaId, unidadMedidaId };
}

describe("registrar productos", () => {
  beforeEach(vaciarTablas);

  it("empieza con stock 0 aunque los datos traigan un stockActual (RN-15)", async () => {
    const datos = { ...(await datosDeProducto()), stockActual: 50 } as DatosProducto;
    const { id } = await registrarProducto(datos);

    const guardado = await prisma.producto.findUniqueOrThrow({ where: { id } });
    expect(guardado.stockActual).toBe(0);
    expect(guardado.codigo).toBe("LIM-001");
    expect(guardado.nombreNormalizado).toBe("lavandina 1 l");
  });

  it("rechaza un código repetido y un nombre repetido normalizado (RN-11)", async () => {
    await crearProductoDePrueba({ codigo: "LIM-001", nombre: "Lavandina 1 L" });

    const porCodigo = await errorDe(registrarProducto(await datosDeProducto({ codigo: "LIM-001", nombre: "Otro" })));
    expect(porCodigo.message).toBe("Ya existe un producto con el código 'LIM-001'");
    expect(porCodigo.campo).toBe("codigo");

    const porNombre = await errorDe(registrarProducto(await datosDeProducto({ codigo: "LIM-002", nombre: " lavandina  1 l " })));
    expect(porNombre.message).toBe("Ya existe un producto con el nombre 'Lavandina 1 L'");
    expect(porNombre.campo).toBe("nombre");
  });

  it("si el producto repetido está inactivo, lo dice y ofrece el enlace", async () => {
    const existente = await crearProductoDePrueba({ codigo: "LIM-001", activo: false });
    const error = await errorDe(registrarProducto(await datosDeProducto({ codigo: "LIM-001" })));
    expect(error.message).toBe("Ya existe un producto inactivo con el código 'LIM-001'");
    expect(error.enlace).toEqual({ texto: "Ver y reactivar", ruta: `/productos/${existente.id}` });
  });

  it("rechaza una categoría o una unidad inactivas (RN-14)", async () => {
    const categoriaInactiva = await crearCategoriaDePrueba({ nombre: "Vieja", activo: false });
    expect((await errorDe(registrarProducto(await datosDeProducto({ categoriaId: categoriaInactiva.id })))).message).toBe(
      "La categoría 'Vieja' está inactiva: elige una activa",
    );

    const unidadInactiva = await crearUnidadDePrueba({ nombre: "Barril", activo: false });
    expect((await errorDe(registrarProducto(await datosDeProducto({ unidadMedidaId: unidadInactiva.id })))).message).toBe(
      "La unidad de medida 'Barril' está inactiva: elige una activa",
    );
  });
});

describe("modificar productos", () => {
  beforeEach(vaciarTablas);

  it("no cambia el stock actual", async () => {
    const producto = await crearProductoDePrueba();
    await crearMovimientoDePrueba(producto.id);

    await modificarProducto(producto.id, { ...(await datosDeProducto({ categoriaId: producto.categoriaId, unidadMedidaId: producto.unidadMedidaId })), stockMinimo: 9 });

    const guardado = await prisma.producto.findUniqueOrThrow({ where: { id: producto.id } });
    expect(guardado.stockActual).toBe(1);
    expect(guardado.stockMinimo).toBe(9);
  });

  it("rechaza cambiar la unidad si hay movimientos, y la permite sin movimientos (RN-16)", async () => {
    const unidad = await crearUnidadDePrueba({ nombre: "Bidón 5 L" });
    const otraUnidad = await crearUnidadDePrueba({ nombre: "Litro" });
    const conMovimientos = await crearProductoDePrueba({ unidadMedidaId: unidad.id });
    const sinMovimientos = await crearProductoDePrueba({ unidadMedidaId: unidad.id });
    await crearMovimientoDePrueba(conMovimientos.id);

    const datos = { codigo: conMovimientos.codigo, nombre: conMovimientos.nombre, categoriaId: conMovimientos.categoriaId, stockMinimo: 0 };
    const error = await errorDe(modificarProducto(conMovimientos.id, { ...datos, unidadMedidaId: otraUnidad.id }));
    expect(error.message).toBe(
      "La unidad de medida no puede cambiar: el stock y el historial de este producto están expresados en 'Bidón 5 L'",
    );
    expect(error.campo).toBe("unidadMedidaId");

    await modificarProducto(sinMovimientos.id, {
      codigo: sinMovimientos.codigo,
      nombre: sinMovimientos.nombre,
      categoriaId: sinMovimientos.categoriaId,
      stockMinimo: 0,
      unidadMedidaId: otraUnidad.id,
    });
    expect((await prisma.producto.findUniqueOrThrow({ where: { id: sinMovimientos.id } })).unidadMedidaId).toBe(otraUnidad.id);
  });

  it("conserva una categoría actual inactiva, pero no permite cambiar a otra inactiva (FR-003)", async () => {
    const actual = await crearCategoriaDePrueba({ nombre: "Actual" });
    const producto = await crearProductoDePrueba({ categoriaId: actual.id });
    await prisma.categoria.update({ where: { id: actual.id }, data: { activo: false } });
    const otraInactiva = await crearCategoriaDePrueba({ nombre: "Otra vieja", activo: false });
    const base = { codigo: producto.codigo, nombre: "Nombre nuevo", unidadMedidaId: producto.unidadMedidaId, stockMinimo: 0 };

    await expect(modificarProducto(producto.id, { ...base, categoriaId: actual.id })).resolves.toBeUndefined();
    expect((await errorDe(modificarProducto(producto.id, { ...base, categoriaId: otraInactiva.id }))).message).toBe(
      "La categoría 'Otra vieja' está inactiva: elige una activa",
    );
  });

  it("rechaza el código o el nombre de otro producto, pero no los propios", async () => {
    const producto = await crearProductoDePrueba({ codigo: "LIM-001", nombre: "Lavandina 1 L" });
    await crearProductoDePrueba({ codigo: "LIM-002", nombre: "Jabón líquido" });
    const base = { categoriaId: producto.categoriaId, unidadMedidaId: producto.unidadMedidaId, stockMinimo: 0 };

    // El servicio recibe el código ya en mayúsculas: lo convierte esquemaProducto.
    expect((await errorDe(modificarProducto(producto.id, { ...base, codigo: "LIM-002", nombre: "Lavandina 1 L" }))).message).toBe(
      "Ya existe un producto con el código 'LIM-002'",
    );
    expect((await errorDe(modificarProducto(producto.id, { ...base, codigo: "LIM-001", nombre: "JABÓN LÍQUIDO" }))).message).toBe(
      "Ya existe un producto con el nombre 'Jabón líquido'",
    );
    await expect(modificarProducto(producto.id, { ...base, codigo: "LIM-001", nombre: "Lavandina 1 L" })).resolves.toBeUndefined();
  });
});

describe("desactivar y reactivar productos (RN-13, RN-17)", () => {
  beforeEach(vaciarTablas);

  it("permite desactivar un producto con stock", async () => {
    const producto = await crearProductoDePrueba();
    await crearMovimientoDePrueba(producto.id);
    await desactivarProducto(producto.id);
    expect((await prisma.producto.findUniqueOrThrow({ where: { id: producto.id } })).activo).toBe(false);
  });

  it("rechaza desactivar con pedidos que tienen saldo pendiente del producto", async () => {
    const producto = await crearProductoDePrueba();
    const representante = await crearRepresentanteDePrueba();
    await crearPedidoConSaldo({ representanteId: representante.id, productoId: producto.id });
    await crearPedidoConSaldo({ representanteId: representante.id, productoId: producto.id, estado: "PARCIAL", entregada: 4 });

    expect((await errorDe(desactivarProducto(producto.id))).message).toBe(
      "No se puede desactivar: 2 pedidos tienen saldo pendiente de este producto",
    );
  });

  it("no cuenta pedidos atendidos, anulados ni líneas ya entregadas por completo", async () => {
    const producto = await crearProductoDePrueba();
    const representante = await crearRepresentanteDePrueba();
    await crearPedidoConSaldo({ representanteId: representante.id, productoId: producto.id, estado: "ATENDIDO", entregada: 10 });
    await crearPedidoConSaldo({ representanteId: representante.id, productoId: producto.id, estado: "ANULADO" });
    await crearPedidoConSaldo({ representanteId: representante.id, productoId: producto.id, estado: "PARCIAL", entregada: 10 });

    await expect(desactivarProducto(producto.id)).resolves.toBeUndefined();
  });

  it("rechaza reactivar si su categoría o su unidad están inactivas", async () => {
    const categoria = await crearCategoriaDePrueba({ nombre: "Desinfectantes" });
    const unidad = await crearUnidadDePrueba({ nombre: "Bidón 5 L" });
    const producto = await crearProductoDePrueba({ categoriaId: categoria.id, unidadMedidaId: unidad.id, activo: false });

    await prisma.categoria.update({ where: { id: categoria.id }, data: { activo: false } });
    expect((await errorDe(reactivarProducto(producto.id))).message).toBe(
      "Primero reactiva la categoría 'Desinfectantes' o cambia el producto a una categoría activa",
    );

    await prisma.categoria.update({ where: { id: categoria.id }, data: { activo: true } });
    await prisma.unidadMedida.update({ where: { id: unidad.id }, data: { activo: false } });
    expect((await errorDe(reactivarProducto(producto.id))).message).toBe(
      "Primero reactiva la unidad de medida 'Bidón 5 L' o cambia el producto a una unidad activa",
    );

    await prisma.unidadMedida.update({ where: { id: unidad.id }, data: { activo: true } });
    await reactivarProducto(producto.id);
    expect((await prisma.producto.findUniqueOrThrow({ where: { id: producto.id } })).activo).toBe(true);
  });
});

describe("consultas de productos", () => {
  beforeEach(vaciarTablas);

  it("marca 'Bajo mínimo' solo en productos activos con stock menor o igual al mínimo (RN-52)", async () => {
    const enCero = await crearProductoDePrueba({ nombre: "A en cero", stockMinimo: 0 });
    const conStock = await crearProductoDePrueba({ nombre: "B con stock", stockMinimo: 0 });
    await crearMovimientoDePrueba(conStock.id);
    const inactivo = await crearProductoDePrueba({ nombre: "C inactivo", stockMinimo: 5, activo: false });

    const productos = await listarProductos({ estado: "todos" });
    expect(productos.find((p) => p.id === enCero.id)?.bajoMinimo).toBe(true);
    expect(productos.find((p) => p.id === conStock.id)?.bajoMinimo).toBe(false);
    expect(productos.find((p) => p.id === inactivo.id)?.bajoMinimo).toBe(false);
  });

  it("ordena por nombre y filtra por estado y categoría", async () => {
    const limpieza = await crearCategoriaDePrueba({ nombre: "Limpieza" });
    await crearProductoDePrueba({ nombre: "Trapeador", categoriaId: limpieza.id });
    await crearProductoDePrueba({ nombre: "Álcohol en gel" });
    await crearProductoDePrueba({ nombre: "Balde", categoriaId: limpieza.id, activo: false });

    expect((await listarProductos({ estado: "activos" })).map((p) => p.nombre)).toEqual(["Álcohol en gel", "Trapeador"]);
    expect((await listarProductos({ estado: "todos", categoriaId: limpieza.id })).map((p) => p.nombre)).toEqual(["Balde", "Trapeador"]);
  });

  it("obtenerProducto informa si tiene movimientos", async () => {
    const producto = await crearProductoDePrueba();
    expect((await obtenerProducto(producto.id))?.tieneMovimientos).toBe(false);
    await crearMovimientoDePrueba(producto.id);
    expect((await obtenerProducto(producto.id))?.tieneMovimientos).toBe(true);
    expect(await obtenerProducto(999)).toBeNull();
  });

  it("el selector solo ofrece productos activos con código, nombre y unidad", async () => {
    const unidad = await crearUnidadDePrueba({ nombre: "Bidón 5 L" });
    const activo = await crearProductoDePrueba({ codigo: "LIM-001", nombre: "Lavandina 1 L", unidadMedidaId: unidad.id });
    await crearProductoDePrueba({ nombre: "Inactivo", activo: false });

    expect(await listarProductosParaSelector()).toEqual([{ id: activo.id, etiqueta: "LIM-001 · Lavandina 1 L (Bidón 5 L)", activo: true }]);
  });
});
