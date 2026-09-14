// Historia 1 · Categorías (FR-004, RN-11, RN-13, RN-14).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ErrorDeNegocio } from "@/lib/errores";
import {
  desactivarCategoria,
  listarCategorias,
  listarCategoriasParaSelector,
  modificarCategoria,
  reactivarCategoria,
  registrarCategoria,
} from "@/servicios/catalogos/categorias";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { crearCategoriaDePrueba, crearProductoDePrueba } from "../ayudantes/catalogos";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

describe("registrar y modificar categorías", () => {
  beforeEach(vaciarTablas);

  it("guarda el nombre recortado y su versión normalizada", async () => {
    const { id } = await registrarCategoria({ nombre: "  Desinfectantes   de  piso ", descripcion: undefined });

    const guardada = await prisma.categoria.findUniqueOrThrow({ where: { id } });
    expect(guardada.nombre).toBe("Desinfectantes de piso");
    expect(guardada.nombreNormalizado).toBe("desinfectantes de piso");
    expect(guardada.descripcion).toBeNull();
    expect(guardada.activo).toBe(true);
  });

  it("rechaza un nombre repetido sin distinguir mayúsculas ni espacios, sin enlace si la otra está activa", async () => {
    await crearCategoriaDePrueba({ nombre: "Desinfectantes" });

    const error = await errorDe(registrarCategoria({ nombre: " desinfectantes " }));
    expect(error.message).toBe("Ya existe una categoría con el nombre 'Desinfectantes'");
    expect(error.campo).toBe("nombre");
    expect(error.enlace).toBeUndefined();
  });

  it("si la categoría repetida está inactiva, lo dice y ofrece el enlace a su ficha", async () => {
    const existente = await crearCategoriaDePrueba({ nombre: "Desinfectantes", activo: false });

    const error = await errorDe(registrarCategoria({ nombre: "DESINFECTANTES" }));
    expect(error.message).toBe("Ya existe una categoría inactiva con el nombre 'Desinfectantes'");
    expect(error.enlace).toEqual({ texto: "Ver y reactivar", ruta: `/categorias/${existente.id}` });
  });

  it("al modificar rechaza el nombre de otra categoría, pero no el propio", async () => {
    const limpieza = await crearCategoriaDePrueba({ nombre: "Limpieza" });
    await crearCategoriaDePrueba({ nombre: "Desinfectantes" });

    const error = await errorDe(modificarCategoria(limpieza.id, { nombre: "desinfectantes" }));
    expect(error.message).toBe("Ya existe una categoría con el nombre 'Desinfectantes'");

    await modificarCategoria(limpieza.id, { nombre: "LIMPIEZA", descripcion: "Productos de limpieza general" });
    const guardada = await prisma.categoria.findUniqueOrThrow({ where: { id: limpieza.id } });
    expect(guardada.nombre).toBe("LIMPIEZA");
    expect(guardada.descripcion).toBe("Productos de limpieza general");
  });

  it("indica si la categoría no existe", async () => {
    expect((await errorDe(modificarCategoria(999, { nombre: "Otra" }))).message).toBe("No existe la categoría indicada");
  });
});

describe("desactivar y reactivar categorías (RN-13)", () => {
  beforeEach(vaciarTablas);

  it("rechaza desactivar con 1 producto activo, en singular", async () => {
    const categoria = await crearCategoriaDePrueba();
    await crearProductoDePrueba({ categoriaId: categoria.id });

    expect((await errorDe(desactivarCategoria(categoria.id))).message).toBe(
      "No se puede desactivar: 1 producto activo usa esta categoría",
    );
  });

  it("rechaza desactivar con 4 productos activos, en plural", async () => {
    const categoria = await crearCategoriaDePrueba();
    for (let i = 0; i < 4; i++) await crearProductoDePrueba({ categoriaId: categoria.id });

    expect((await errorDe(desactivarCategoria(categoria.id))).message).toBe(
      "No se puede desactivar: 4 productos activos usan esta categoría",
    );
  });

  it("permite desactivar si sus productos están inactivos, y reactivar después", async () => {
    const categoria = await crearCategoriaDePrueba();
    await crearProductoDePrueba({ categoriaId: categoria.id, activo: false });

    await desactivarCategoria(categoria.id);
    expect((await prisma.categoria.findUniqueOrThrow({ where: { id: categoria.id } })).activo).toBe(false);
    expect((await errorDe(desactivarCategoria(categoria.id))).message).toBe("La categoría ya está inactiva");

    await reactivarCategoria(categoria.id);
    expect((await prisma.categoria.findUniqueOrThrow({ where: { id: categoria.id } })).activo).toBe(true);
    expect((await errorDe(reactivarCategoria(categoria.id))).message).toBe("La categoría ya está activa");
  });
});

describe("listados y selector de categorías", () => {
  beforeEach(vaciarTablas);

  it("el selector solo ofrece activas, más la actual marcada si está inactiva (FR-003)", async () => {
    const activa = await crearCategoriaDePrueba({ nombre: "Limpieza" });
    const inactiva = await crearCategoriaDePrueba({ nombre: "Antiguos", activo: false });

    expect(await listarCategoriasParaSelector()).toEqual([{ id: activa.id, etiqueta: "Limpieza", activo: true }]);
    expect(await listarCategoriasParaSelector(inactiva.id)).toEqual([
      { id: inactiva.id, etiqueta: "Antiguos (inactiva)", activo: false },
      { id: activa.id, etiqueta: "Limpieza", activo: true },
    ]);
  });

  it("filtra por estado, ordena por nombre y cuenta los productos activos", async () => {
    const limpieza = await crearCategoriaDePrueba({ nombre: "Limpieza" });
    await crearCategoriaDePrueba({ nombre: "Álcalis" });
    await crearCategoriaDePrueba({ nombre: "Viejos", activo: false });
    await crearProductoDePrueba({ categoriaId: limpieza.id });
    await crearProductoDePrueba({ categoriaId: limpieza.id, activo: false });

    const activas = await listarCategorias({ estado: "activos" });
    expect(activas.map((c) => c.nombre)).toEqual(["Álcalis", "Limpieza"]);
    expect(activas.find((c) => c.id === limpieza.id)?.productosActivos).toBe(1);

    expect((await listarCategorias({ estado: "inactivos" })).map((c) => c.nombre)).toEqual(["Viejos"]);
    expect(await listarCategorias({ estado: "todos" })).toHaveLength(3);
  });
});
