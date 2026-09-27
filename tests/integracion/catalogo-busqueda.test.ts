// Historia 5 · Buscar y filtrar en los listados (FR-007, research C-01).
import { beforeAll, describe, expect, it } from "vitest";
import { listarCategorias } from "@/servicios/catalogos/categorias";
import { listarCentrosSalud } from "@/servicios/catalogos/centros-salud";
import { listarProductos } from "@/servicios/catalogos/productos";
import { listarProveedores } from "@/servicios/catalogos/proveedores";
import { listarRepresentantes } from "@/servicios/catalogos/representantes";
import { listarUnidadesMedida } from "@/servicios/catalogos/unidades-medida";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import {
  crearCategoriaDePrueba,
  crearCentroSaludDePrueba,
  crearProductoDePrueba,
  crearProveedorDePrueba,
  crearRepresentanteDePrueba,
  crearUnidadDePrueba,
} from "../ayudantes/catalogos";

let limpiezaId: number;

beforeAll(async () => {
  await vaciarTablas();
  const limpieza = await crearCategoriaDePrueba({ nombre: "Limpieza", descripcion: "Productos de aseo general" });
  const desinfeccion = await crearCategoriaDePrueba({ nombre: "Desinfección" });
  limpiezaId = limpieza.id;
  const bidon = await crearUnidadDePrueba({ nombre: "Bidón 5 L", abreviatura: "BID5" });

  await crearProductoDePrueba({ codigo: "LIM-001", nombre: "Lavandina 1 L", categoriaId: limpieza.id, unidadMedidaId: bidon.id });
  await crearProductoDePrueba({ codigo: "LIM-002", nombre: "Jabón líquido", categoriaId: limpieza.id, unidadMedidaId: bidon.id });
  await crearProductoDePrueba({ codigo: "DES-001", nombre: "Alcohol en gel", categoriaId: desinfeccion.id, unidadMedidaId: bidon.id });
  await crearProductoDePrueba({ codigo: "LIM-003", nombre: "Lavandina 5 L", categoriaId: limpieza.id, unidadMedidaId: bidon.id, activo: false });

  await crearProveedorDePrueba({ razonSocial: "Distribuidora Andina S.R.L.", nit: "1020304050" });
  await crearProveedorDePrueba({ razonSocial: "Química Oruro", nit: "7778889" });

  const centro = await crearCentroSaludDePrueba({ nombre: "Hospital San Juan de Dios" });
  // Un representante activo por centro (RN-18): cada uno en el suyo.
  const policlinico = await crearCentroSaludDePrueba({ nombre: "Policlínico Pediátrico" });
  await crearRepresentanteDePrueba({ nombre: "Ana", apellido: "Quispe", centroSaludId: centro.id });
  await crearRepresentanteDePrueba({ nombre: "Luis", apellido: "Mamani", centroSaludId: policlinico.id });
});

describe("búsqueda sin mayúsculas ni tildes en los seis listados", () => {
  it("productos: por nombre y por código", async () => {
    expect((await listarProductos({ q: "lava", estado: "activos" })).map((p) => p.nombre)).toEqual(["Lavandina 1 L"]);
    expect((await listarProductos({ q: "LAVANDÍNA", estado: "activos" })).map((p) => p.nombre)).toEqual(["Lavandina 1 L"]);
    expect((await listarProductos({ q: "LIM", estado: "activos" })).map((p) => p.codigo)).toEqual(["LIM-002", "LIM-001"]);
  });

  it("productos: combina la búsqueda con el estado y la categoría, y conserva el orden", async () => {
    expect((await listarProductos({ q: "lavandina", estado: "todos" })).map((p) => p.nombre)).toEqual(["Lavandina 1 L", "Lavandina 5 L"]);
    expect((await listarProductos({ q: "lavandina", estado: "inactivos" })).map((p) => p.nombre)).toEqual(["Lavandina 5 L"]);
    expect((await listarProductos({ estado: "activos", categoriaId: limpiezaId })).map((p) => p.nombre)).toEqual([
      "Jabón líquido",
      "Lavandina 1 L",
    ]);
    expect(await listarProductos({ q: "alcohol", estado: "activos", categoriaId: limpiezaId })).toEqual([]);
  });

  it("categorías: por nombre sin tilde y por descripción", async () => {
    expect((await listarCategorias({ q: "desinfeccion", estado: "activos" })).map((c) => c.nombre)).toEqual(["Desinfección"]);
    expect((await listarCategorias({ q: "aseo", estado: "activos" })).map((c) => c.nombre)).toEqual(["Limpieza"]);
  });

  it("unidades: por nombre y por abreviatura", async () => {
    expect(await listarUnidadesMedida({ q: "bidon", estado: "activos" })).toHaveLength(1);
    expect(await listarUnidadesMedida({ q: "bid5", estado: "activos" })).toHaveLength(1);
  });

  it("proveedores: por razón social y por NIT", async () => {
    expect((await listarProveedores({ q: "andina", estado: "activos" })).map((p) => p.razonSocial)).toEqual(["Distribuidora Andina S.R.L."]);
    expect((await listarProveedores({ q: "1020", estado: "activos" })).map((p) => p.nit)).toEqual(["1020304050"]);
    expect((await listarProveedores({ q: "QUIMICA", estado: "activos" })).map((p) => p.razonSocial)).toEqual(["Química Oruro"]);
  });

  it("centros de salud: por nombre", async () => {
    expect(await listarCentrosSalud({ q: "san juan", estado: "activos" })).toHaveLength(1);
  });

  it("representantes: por centro de salud, apellido y nombre", async () => {
    expect((await listarRepresentantes({ q: "san juan", estado: "activos" })).map((r) => r.nombreCompleto)).toEqual(["Quispe, Ana"]);
    expect((await listarRepresentantes({ q: "mamani", estado: "activos" })).map((r) => r.nombreCompleto)).toEqual(["Mamani, Luis"]);
    expect((await listarRepresentantes({ q: "pediatrico", estado: "activos" })).map((r) => r.nombreCompleto)).toEqual(["Mamani, Luis"]);
    expect(await listarRepresentantes({ q: "pediatrico", estado: "inactivos" })).toEqual([]);
  });
});
