import { describe, expect, it } from "vitest";
import { coincideBusqueda, compararEnEspanol, normalizarTexto, paraBuscar, recortarEspacios } from "@/lib/texto";

describe("normalizarTexto (RN-10)", () => {
  it("quita espacios extra y pasa a minúsculas", () => {
    expect(normalizarTexto(" Lavandina  1 L ")).toBe("lavandina 1 l");
  });

  it("reconoce como iguales nombres que solo difieren en mayúsculas y espacios", () => {
    expect(normalizarTexto(" lavandina  1 l ")).toBe(normalizarTexto("Lavandina 1 L"));
  });

  it("conserva las tildes", () => {
    expect(normalizarTexto("Pérez")).toBe("pérez");
    expect(normalizarTexto("Pérez")).not.toBe(normalizarTexto("Perez"));
  });
});

describe("recortarEspacios", () => {
  it("quita espacios extra respetando las mayúsculas", () => {
    expect(recortarEspacios("  Juan   Pérez ")).toBe("Juan Pérez");
  });
});

describe("paraBuscar y coincideBusqueda (FR-007, research C-01)", () => {
  it("quita tildes, mayúsculas y espacios extra", () => {
    expect(paraBuscar("  Lavandína  ÁCIDA ")).toBe("lavandina acida");
  });

  it("'lavandína' y 'LAVA' encuentran 'Lavandina 1 L'", () => {
    expect(coincideBusqueda("lavandína", "Lavandina 1 L")).toBe(true);
    expect(coincideBusqueda("LAVA", "Lavandina 1 L")).toBe(true);
  });

  it("busca en cualquiera de los campos", () => {
    expect(coincideBusqueda("lim-0", "Lavandina 1 L", "LIM-001")).toBe(true);
    expect(coincideBusqueda("jabon", "Lavandina 1 L", "LIM-001")).toBe(false);
  });

  it("un texto vacío o ausente coincide con todo", () => {
    expect(coincideBusqueda("", "Lavandina")).toBe(true);
    expect(coincideBusqueda("   ", "Lavandina")).toBe(true);
    expect(coincideBusqueda(undefined, "Lavandina")).toBe(true);
  });

  it("un campo sin dato no rompe la búsqueda", () => {
    expect(coincideBusqueda("ana", null, undefined, "Ana López")).toBe(true);
    expect(coincideBusqueda("ana", null)).toBe(false);
  });
});

describe("compararEnEspanol", () => {
  it("ordena 'Álvarez' antes que 'Beltrán' y no distingue mayúsculas", () => {
    expect(["Beltrán", "zapata", "Álvarez"].sort(compararEnEspanol)).toEqual(["Álvarez", "Beltrán", "zapata"]);
  });
});
