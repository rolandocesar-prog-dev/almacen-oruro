import { describe, expect, it } from "vitest";
import { z, type ZodType } from "zod";
import { esquemaCategoria } from "@/esquemas/catalogos/categoria";
import { esquemaUnidadMedida } from "@/esquemas/catalogos/unidad-medida";

function erroresDe(esquema: ZodType, datos: Record<string, unknown>): Partial<Record<string, string[]>> {
  const resultado = esquema.safeParse(datos);
  return resultado.success ? {} : z.flattenError(resultado.error).fieldErrors;
}

describe("esquemaCategoria (FR-004)", () => {
  it("acepta un nombre con descripción vacía", () => {
    const datos = esquemaCategoria.parse({ nombre: " Desinfectantes ", descripcion: "" });
    expect(datos.nombre).toBe("Desinfectantes");
    expect(datos.descripcion).toBeUndefined();
  });

  it("exige el nombre y limita a 60 caracteres", () => {
    expect(erroresDe(esquemaCategoria, { nombre: "   " }).nombre).toEqual(["Escribe el nombre"]);
    expect(erroresDe(esquemaCategoria, { nombre: "a".repeat(61) }).nombre).toEqual(["El nombre admite hasta 60 caracteres"]);
  });

  it("limita la descripción a 200 caracteres", () => {
    expect(erroresDe(esquemaCategoria, { nombre: "Limpieza", descripcion: "a".repeat(201) }).descripcion).toEqual([
      "La descripción admite hasta 200 caracteres",
    ]);
  });
});

describe("esquemaUnidadMedida (FR-005)", () => {
  it("acepta nombre y abreviatura", () => {
    expect(esquemaUnidadMedida.parse({ nombre: " Bidón 5 L ", abreviatura: " BID5 " })).toEqual({ nombre: "Bidón 5 L", abreviatura: "BID5" });
  });

  it("exige el nombre, hasta 40 caracteres", () => {
    expect(erroresDe(esquemaUnidadMedida, { nombre: "", abreviatura: "UN" }).nombre).toEqual(["Escribe el nombre"]);
    expect(erroresDe(esquemaUnidadMedida, { nombre: "a".repeat(41), abreviatura: "UN" }).nombre).toEqual([
      "El nombre admite hasta 40 caracteres",
    ]);
  });

  it("exige la abreviatura, hasta 10 caracteres", () => {
    expect(erroresDe(esquemaUnidadMedida, { nombre: "Unidad", abreviatura: " " }).abreviatura).toEqual(["Escribe la abreviatura"]);
    expect(erroresDe(esquemaUnidadMedida, { nombre: "Unidad", abreviatura: "a".repeat(11) }).abreviatura).toEqual([
      "La abreviatura admite hasta 10 caracteres",
    ]);
  });
});
