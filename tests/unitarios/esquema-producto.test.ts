import { describe, expect, it } from "vitest";
import { z } from "zod";
import { esquemaFiltroProductos, esquemaProducto } from "@/esquemas/catalogos/producto";

const datosValidos = {
  codigo: " lim-001 ",
  nombre: "Lavandina 1 L",
  descripcion: "",
  categoriaId: "1",
  unidadMedidaId: "2",
  stockMinimo: "5",
};

const MENSAJE_CODIGO = "Usa hasta 20 caracteres: letras sin Ñ ni tildes, dígitos y guion";
const MENSAJE_STOCK = "El stock mínimo debe ser un número entero mayor o igual a 0";

function erroresDe(datos: Record<string, unknown>): Partial<Record<string, string[]>> {
  const resultado = esquemaProducto.safeParse(datos);
  return resultado.success ? {} : z.flattenError(resultado.error).fieldErrors;
}

describe("esquemaProducto (FR-006, FR-012, RN-15)", () => {
  it("acepta datos válidos, pasa el código a mayúsculas y convierte los números", () => {
    expect(esquemaProducto.parse(datosValidos)).toEqual({
      codigo: "LIM-001",
      nombre: "Lavandina 1 L",
      descripcion: undefined,
      categoriaId: 1,
      unidadMedidaId: 2,
      stockMinimo: 5,
    });
  });

  it.each(["LIM_001", "LIM 001", "BAÑ-001", "A".repeat(21)])("rechaza el código %s", (codigo) => {
    expect(erroresDe({ ...datosValidos, codigo }).codigo).toEqual([MENSAJE_CODIGO]);
  });

  it("exige el código y el nombre, hasta 80 caracteres", () => {
    expect(erroresDe({ ...datosValidos, codigo: " " }).codigo).toEqual(["Escribe el código"]);
    expect(erroresDe({ ...datosValidos, nombre: "" }).nombre).toEqual(["Escribe el nombre"]);
    expect(erroresDe({ ...datosValidos, nombre: "a".repeat(81) }).nombre).toEqual(["El nombre admite hasta 80 caracteres"]);
  });

  it.each(["-1", "2.5", "", "abc"])("rechaza el stock mínimo '%s'", (stockMinimo) => {
    expect(erroresDe({ ...datosValidos, stockMinimo }).stockMinimo).toEqual([MENSAJE_STOCK]);
  });

  it("acepta stock mínimo 0", () => {
    expect(esquemaProducto.parse({ ...datosValidos, stockMinimo: "0" }).stockMinimo).toBe(0);
  });

  it("exige elegir categoría y unidad de medida", () => {
    const errores = erroresDe({ ...datosValidos, categoriaId: "", unidadMedidaId: "" });
    expect(errores.categoriaId).toEqual(["Elige una categoría"]);
    expect(errores.unidadMedidaId).toEqual(["Elige una unidad de medida"]);
  });

  it("descarta un stockActual enviado: el stock solo cambia con el kardex", () => {
    const datos = esquemaProducto.parse({ ...datosValidos, stockActual: "50" });
    expect(datos).not.toHaveProperty("stockActual");
  });
});

describe("esquemaFiltroProductos", () => {
  it("lee la categoría como número y la ignora si es inválida", () => {
    expect(esquemaFiltroProductos.parse({ categoria: "3" }).categoria).toBe(3);
    expect(esquemaFiltroProductos.parse({ categoria: "" }).categoria).toBeUndefined();
    expect(esquemaFiltroProductos.parse({ categoria: "abc" }).categoria).toBeUndefined();
    expect(esquemaFiltroProductos.parse({}).estado).toBe("activos");
  });
});
