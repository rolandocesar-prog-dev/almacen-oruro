// Pantalla de pronóstico sobre datos reales (F-007, Historia 2; FR-006, SC-002).
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { pronosticoDeProductos } from "@/servicios/ia/pronostico";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearCategoriaDePrueba } from "../ayudantes/catalogos";
import { productoConSerie, productoConStock } from "../ayudantes/consumo";

const AHORA = new Date("2026-09-15T12:00:00Z");

let ids: { corto: number; sinHistorial: number; holgado: number; inactivo: number; limpieza: number };

describe("pronosticoDeProductos (Historia 2)", () => {
  beforeAll(async () => {
    await vaciarTablas();
    const { usuario } = await crearUsuarioDePrueba();
    const limpieza = await crearCategoriaDePrueba({ nombre: "Limpieza" });
    const papel = await crearCategoriaDePrueba({ nombre: "Papel" });

    // Junio a agosto con 6, 9 y 12: promedio móvil 9; mínimo 5 y stock final 4 → reposición 10.
    const corto = await productoConSerie(usuario.id, "2026-06", [6, 9, 12], { stockFinal: 4, stockMinimo: 5, categoriaId: limpieza.id });
    // Sin distribuciones: pronóstico 0; mínimo 10 y stock 3 → reposición 7.
    const sinHistorial = await productoConStock(usuario.id, 3, { stockMinimo: 10, categoriaId: papel.id });
    // Mucho stock: la reposición es 0.
    const holgado = await productoConSerie(usuario.id, "2026-06", [2, 2, 2], { stockFinal: 100, stockMinimo: 1, categoriaId: papel.id });
    const inactivo = await productoConSerie(usuario.id, "2026-07", [5, 5], { categoriaId: limpieza.id });
    await prisma.producto.update({ where: { id: inactivo.id }, data: { activo: false } });

    ids = { corto: corto.id, sinHistorial: sinHistorial.id, holgado: holgado.id, inactivo: inactivo.id, limpieza: limpieza.id };
  });

  it("devuelve una fila por producto activo con método, pronóstico, stock y reposición (H2 · E1)", async () => {
    const { mesPronosticado, filas, totales } = await pronosticoDeProductos({}, AHORA);

    expect(mesPronosticado).toBe("2026-09");
    expect(filas.map((fila) => fila.productoId).sort()).toEqual([ids.corto, ids.sinHistorial, ids.holgado].sort());

    const corto = filas.find((fila) => fila.productoId === ids.corto);
    expect(corto).toMatchObject({
      categoria: "Limpieza",
      mesPronosticado: "2026-09",
      metodo: "promedio-movil",
      etiquetaMetodo: "Promedio móvil (3 meses)",
      pronostico: 9,
      stockActual: 4,
      stockMinimo: 5,
      reposicionSugerida: 10,
    });
    expect(corto?.codigo).toBeTruthy();
    expect(corto?.unidad).toBeTruthy();

    expect(filas.find((fila) => fila.productoId === ids.sinHistorial)).toMatchObject({
      metodo: "sin-historial",
      pronostico: 0,
      reposicionSugerida: 7,
    });
    expect(filas.find((fila) => fila.productoId === ids.holgado)?.reposicionSugerida).toBe(0);
    expect(totales).toEqual({ unidadesSugeridas: 17, productos: 3 });
  });

  it("un producto inactivo no aparece aunque tenga historia", async () => {
    const { filas } = await pronosticoDeProductos({}, AHORA);
    expect(filas.some((fila) => fila.productoId === ids.inactivo)).toBe(false);
  });

  it("dos consultas seguidas dan exactamente el mismo resultado (SC-002)", async () => {
    expect(await pronosticoDeProductos({}, AHORA)).toEqual(await pronosticoDeProductos({}, AHORA));
  });

  it("filtra por categoría y recalcula el total (H2 · E8)", async () => {
    const { filas, totales } = await pronosticoDeProductos({ categoriaId: ids.limpieza }, AHORA);
    expect(filas.map((fila) => fila.productoId)).toEqual([ids.corto]);
    expect(totales).toEqual({ unidadesSugeridas: 10, productos: 1 });
  });

  it("«solo con reposición mayor que 0» deja fuera los productos con stock holgado (H2 · E8)", async () => {
    const { filas, totales } = await pronosticoDeProductos({ soloConReposicion: true }, AHORA);
    expect(filas.map((fila) => fila.productoId).sort()).toEqual([ids.corto, ids.sinHistorial].sort());
    expect(totales).toEqual({ unidadesSugeridas: 17, productos: 2 });
  });

  it("consultar no escribe nada en la base (FR-004)", async () => {
    const antes = await Promise.all([prisma.movimientoInventario.count(), prisma.producto.findMany({ orderBy: { id: "asc" } })]);
    await pronosticoDeProductos({}, AHORA);
    const despues = await Promise.all([prisma.movimientoInventario.count(), prisma.producto.findMany({ orderBy: { id: "asc" } })]);
    expect(despues).toEqual(antes);
  });
});
