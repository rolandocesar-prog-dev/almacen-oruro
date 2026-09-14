// Historia 1 · Unidades de medida (FR-005, RN-11, RN-13, RN-14).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ErrorDeNegocio } from "@/lib/errores";
import {
  desactivarUnidadMedida,
  listarUnidadesMedida,
  listarUnidadesParaSelector,
  modificarUnidadMedida,
  reactivarUnidadMedida,
  registrarUnidadMedida,
} from "@/servicios/catalogos/unidades-medida";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba, crearUnidadDePrueba } from "../ayudantes/catalogos";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

describe("registrar y modificar unidades de medida", () => {
  beforeEach(vaciarTablas);

  it("guarda el nombre recortado, su versión normalizada y la abreviatura", async () => {
    const { id } = await registrarUnidadMedida({ nombre: " Bidón  5 L ", abreviatura: "BID5" });

    const guardada = await prisma.unidadMedida.findUniqueOrThrow({ where: { id } });
    expect(guardada.nombre).toBe("Bidón 5 L");
    expect(guardada.nombreNormalizado).toBe("bidón 5 l");
    expect(guardada.abreviatura).toBe("BID5");
  });

  it("rechaza un nombre repetido, con enlace solo si la existente está inactiva", async () => {
    await crearUnidadDePrueba({ nombre: "Bidón 5 L" });
    const error = await errorDe(registrarUnidadMedida({ nombre: "bidón 5 l", abreviatura: "B5" }));
    expect(error.message).toBe("Ya existe una unidad de medida con el nombre 'Bidón 5 L'");
    expect(error.enlace).toBeUndefined();

    const inactiva = await crearUnidadDePrueba({ nombre: "Caja", activo: false });
    const errorInactiva = await errorDe(registrarUnidadMedida({ nombre: "CAJA", abreviatura: "CJ" }));
    expect(errorInactiva.message).toBe("Ya existe una unidad de medida inactiva con el nombre 'Caja'");
    expect(errorInactiva.enlace).toEqual({ texto: "Ver y reactivar", ruta: `/unidades/${inactiva.id}` });
  });

  it("permite repetir la abreviatura", async () => {
    await crearUnidadDePrueba({ nombre: "Unidad", abreviatura: "U" });
    await expect(registrarUnidadMedida({ nombre: "Unidad suelta", abreviatura: "U" })).resolves.toHaveProperty("id");
  });

  it("al modificar rechaza el nombre de otra unidad, pero no el propio", async () => {
    const caja = await crearUnidadDePrueba({ nombre: "Caja" });
    await crearUnidadDePrueba({ nombre: "Paquete" });

    expect((await errorDe(modificarUnidadMedida(caja.id, { nombre: "paquete", abreviatura: "CJ" }))).message).toBe(
      "Ya existe una unidad de medida con el nombre 'Paquete'",
    );
    await expect(modificarUnidadMedida(caja.id, { nombre: "Caja", abreviatura: "CJA" })).resolves.toBeUndefined();
  });
});

describe("desactivar y reactivar unidades de medida (RN-13)", () => {
  beforeEach(vaciarTablas);

  it("rechaza desactivar con productos activos, en singular y en plural", async () => {
    const unidad = await crearUnidadDePrueba();
    await crearProductoDePrueba({ unidadMedidaId: unidad.id });
    expect((await errorDe(desactivarUnidadMedida(unidad.id))).message).toBe(
      "No se puede desactivar: 1 producto activo usa esta unidad de medida",
    );

    for (let i = 0; i < 3; i++) await crearProductoDePrueba({ unidadMedidaId: unidad.id });
    expect((await errorDe(desactivarUnidadMedida(unidad.id))).message).toBe(
      "No se puede desactivar: 4 productos activos usan esta unidad de medida",
    );
  });

  it("permite desactivar si sus productos están inactivos, y reactivar después", async () => {
    const unidad = await crearUnidadDePrueba();
    await crearProductoDePrueba({ unidadMedidaId: unidad.id, activo: false });

    await desactivarUnidadMedida(unidad.id);
    expect((await prisma.unidadMedida.findUniqueOrThrow({ where: { id: unidad.id } })).activo).toBe(false);
    await reactivarUnidadMedida(unidad.id);
    expect((await prisma.unidadMedida.findUniqueOrThrow({ where: { id: unidad.id } })).activo).toBe(true);
  });
});

describe("listados y selector de unidades", () => {
  beforeEach(vaciarTablas);

  it("el selector solo ofrece activas con su abreviatura, más la actual si está inactiva", async () => {
    const bidon = await crearUnidadDePrueba({ nombre: "Bidón 5 L", abreviatura: "BID5" });
    const vieja = await crearUnidadDePrueba({ nombre: "Barril", abreviatura: "BRL", activo: false });

    expect(await listarUnidadesParaSelector()).toEqual([{ id: bidon.id, etiqueta: "Bidón 5 L (BID5)", activo: true }]);
    expect(await listarUnidadesParaSelector(vieja.id)).toEqual([
      { id: vieja.id, etiqueta: "Barril (BRL) (inactiva)", activo: false },
      { id: bidon.id, etiqueta: "Bidón 5 L (BID5)", activo: true },
    ]);
  });

  it("filtra por estado y cuenta los productos activos", async () => {
    const unidad = await crearUnidadDePrueba({ nombre: "Litro" });
    await crearUnidadDePrueba({ nombre: "Galón", activo: false });
    await crearProductoDePrueba({ unidadMedidaId: unidad.id });

    const activas = await listarUnidadesMedida({ estado: "activos" });
    expect(activas).toHaveLength(1);
    expect(activas[0]).toMatchObject({ nombre: "Litro", productosActivos: 1 });
    expect((await listarUnidadesMedida({ estado: "inactivos" })).map((u) => u.nombre)).toEqual(["Galón"]);
  });
});
