// Historia 2 · Consultar las existencias (FR-018, RN-52).
// El stock se carga con los ayudantes de la fase 2 (compra sin movimientos + registrarMovimiento), sin
// usar registrarCompra: así esta historia no depende de la Historia 1.
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { listarExistencias, registrarMovimiento } from "@/servicios/inventario";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { crearCategoriaDePrueba, crearProductoDePrueba } from "../ayudantes/catalogos";
import { crearCompraSinMovimientosDePrueba } from "../ayudantes/inventario";

async function cargarStock(productoId: number, cantidad: number) {
  const { compra, usuario } = await crearCompraSinMovimientosDePrueba({ productoId, cantidad });
  await prisma.$transaction((tx) =>
    registrarMovimiento(tx, { productoId, tipo: "ENTRADA_COMPRA", cantidad, fechaDocumento: compra.fecha, compraId: compra.id, usuarioId: usuario.id }),
  );
}

describe("listarExistencias", () => {
  beforeEach(vaciarTablas);

  it("ordena primero los bajo mínimo y luego por nombre, y los cuenta (RN-52)", async () => {
    const sobre = await crearProductoDePrueba({ nombre: "Alcohol en gel", stockMinimo: 5 });
    const igual = await crearProductoDePrueba({ nombre: "Trapeador", stockMinimo: 5 });
    const bajo = await crearProductoDePrueba({ nombre: "Lavandina 1 L", stockMinimo: 5 });
    await cargarStock(sobre.id, 20);
    await cargarStock(igual.id, 5);
    await cargarStock(bajo.id, 2);

    const resultado = await listarExistencias({ estado: "habituales" });
    expect(resultado.productos.map((p) => p.nombre)).toEqual(["Lavandina 1 L", "Trapeador", "Alcohol en gel"]);
    expect(resultado.productos.find((p) => p.id === igual.id)?.bajoMinimo).toBe(true);
    expect(resultado).toMatchObject({ total: 3, bajoMinimo: 2 });

    const soloBajo = await listarExistencias({ estado: "habituales", soloBajoMinimo: true });
    expect(soloBajo.productos.map((p) => p.nombre)).toEqual(["Lavandina 1 L", "Trapeador"]);
  });

  it("muestra por defecto los inactivos con stock, marcados y sin contarlos como bajo mínimo", async () => {
    const conStock = await crearProductoDePrueba({ nombre: "Escoba vieja", stockMinimo: 10 });
    await cargarStock(conStock.id, 8);
    await prisma.producto.update({ where: { id: conStock.id }, data: { activo: false } });
    await crearProductoDePrueba({ nombre: "Balde roto", activo: false, stockMinimo: 3 });

    const habituales = await listarExistencias({ estado: "habituales" });
    expect(habituales.productos.map((p) => [p.nombre, p.activo, p.bajoMinimo])).toEqual([["Escoba vieja", false, false]]);
    expect(habituales.bajoMinimo).toBe(0);

    expect((await listarExistencias({ estado: "inactivos" })).productos.map((p) => p.nombre)).toEqual(["Balde roto", "Escoba vieja"]);
    expect((await listarExistencias({ estado: "todos" })).total).toBe(2);
  });

  it("filtra por búsqueda sin tildes y por categoría", async () => {
    const limpieza = await crearCategoriaDePrueba({ nombre: "Limpieza" });
    await crearProductoDePrueba({ codigo: "LIM-001", nombre: "Lavandina 1 L", categoriaId: limpieza.id, stockMinimo: 0 });
    await crearProductoDePrueba({ codigo: "DES-001", nombre: "Alcohol en gel", stockMinimo: 0 });

    expect((await listarExistencias({ estado: "habituales", q: "LAVANDÍNA" })).productos.map((p) => p.codigo)).toEqual(["LIM-001"]);
    expect((await listarExistencias({ estado: "habituales", q: "des-0" })).productos.map((p) => p.codigo)).toEqual(["DES-001"]);
    expect((await listarExistencias({ estado: "habituales", categoriaId: limpieza.id })).productos.map((p) => p.codigo)).toEqual(["LIM-001"]);
  });

  it("trae categoría, unidad, stock actual y mínimo de cada producto", async () => {
    const producto = await crearProductoDePrueba({ codigo: "LIM-001", stockMinimo: 4 });
    await cargarStock(producto.id, 9);

    const [fila] = (await listarExistencias({ estado: "habituales" })).productos;
    expect(fila).toMatchObject({ codigo: "LIM-001", stockActual: 9, stockMinimo: 4, activo: true, bajoMinimo: false });
    expect(typeof fila?.categoria).toBe("string");
    expect(typeof fila?.unidad).toBe("string");
  });
});
