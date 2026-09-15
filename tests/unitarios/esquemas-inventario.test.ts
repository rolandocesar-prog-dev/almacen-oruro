import { describe, expect, it } from "vitest";
import { esquemaFiltroExistencias, esquemaFiltroKardex } from "@/esquemas/inventario";

describe("esquemaFiltroExistencias (FR-018)", () => {
  it("por defecto muestra los habituales, sin filtro de bajo mínimo", () => {
    expect(esquemaFiltroExistencias.parse({})).toEqual({ q: undefined, categoria: undefined, estado: "habituales", bajoMinimo: undefined });
  });

  it("lee los filtros válidos", () => {
    expect(esquemaFiltroExistencias.parse({ q: " lava ", categoria: "3", estado: "todos", bajoMinimo: "si" })).toEqual({
      q: "lava",
      categoria: 3,
      estado: "todos",
      bajoMinimo: "si",
    });
  });

  it("los valores inválidos toman el valor por defecto", () => {
    expect(esquemaFiltroExistencias.parse({ categoria: "abc", estado: "otro", bajoMinimo: "tal vez" })).toMatchObject({
      categoria: undefined,
      estado: "habituales",
      bajoMinimo: undefined,
    });
  });
});

describe("esquemaFiltroKardex (FR-019)", () => {
  it("sin rango es válido", () => {
    expect(esquemaFiltroKardex.parse({})).toEqual({ desde: undefined, hasta: undefined });
    expect(esquemaFiltroKardex.parse({ desde: "", hasta: "" })).toEqual({ desde: undefined, hasta: undefined });
  });

  it("acepta un rango parcial o completo", () => {
    expect(esquemaFiltroKardex.parse({ desde: "2026-09-01" })).toEqual({ desde: "2026-09-01", hasta: undefined });
    expect(esquemaFiltroKardex.parse({ desde: "2026-09-01", hasta: "2026-09-10" }).hasta).toBe("2026-09-10");
  });

  it("rechaza desde posterior a hasta y fechas inválidas", () => {
    expect(esquemaFiltroKardex.safeParse({ desde: "2026-09-10", hasta: "2026-09-01" }).error?.issues[0]?.message).toBe(
      "La fecha «desde» no puede ser posterior a «hasta»",
    );
    expect(esquemaFiltroKardex.safeParse({ desde: "2026-13-01" }).error?.issues[0]?.message).toBe("Usa una fecha válida");
  });
});
