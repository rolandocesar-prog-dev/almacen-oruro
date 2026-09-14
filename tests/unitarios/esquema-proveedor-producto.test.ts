import { describe, expect, it } from "vitest";
import { z } from "zod";
import { esquemaFiltroAsociaciones, esquemaPrecioReferencial, esquemaProveedorProducto } from "@/esquemas/catalogos/proveedor-producto";

const MENSAJE_PRECIO = "Escribe un precio mayor que 0 con hasta 2 decimales";

function erroresDe(datos: Record<string, unknown>): Partial<Record<string, string[]>> {
  const resultado = esquemaProveedorProducto.safeParse(datos);
  return resultado.success ? {} : z.flattenError(resultado.error).fieldErrors;
}

describe("esquemaPrecioReferencial (research C-08)", () => {
  it("un precio vacío significa sin precio", () => {
    expect(esquemaPrecioReferencial.parse("")).toBeUndefined();
    expect(esquemaPrecioReferencial.parse("  ")).toBeUndefined();
  });

  it("acepta coma o punto decimal y devuelve el texto con punto", () => {
    expect(esquemaPrecioReferencial.parse("12,50")).toBe("12.50");
    expect(esquemaPrecioReferencial.parse("12.50")).toBe("12.50");
    expect(esquemaPrecioReferencial.parse("9999999999,99")).toBe("9999999999.99");
  });

  it.each(["12,505", "0", "0,00", "-3", "abc", "10000000000"])("rechaza '%s'", (precio) => {
    expect(erroresDe({ productoId: "1", precioReferencial: precio }).precioReferencial).toEqual([MENSAJE_PRECIO]);
  });
});

describe("esquemaProveedorProducto y filtro de asociaciones", () => {
  it("exige elegir un producto", () => {
    expect(erroresDe({ productoId: "", precioReferencial: "" }).productoId).toEqual(["Elige un producto"]);
    expect(esquemaProveedorProducto.parse({ productoId: "4", precioReferencial: "8,5" })).toEqual({ productoId: 4, precioReferencial: "8.5" });
  });

  it("muestra las activas si el filtro es inválido", () => {
    expect(esquemaFiltroAsociaciones.parse({ asociaciones: "inactivas" }).asociaciones).toBe("inactivas");
    expect(esquemaFiltroAsociaciones.parse({ asociaciones: "otra" }).asociaciones).toBe("activas");
    expect(esquemaFiltroAsociaciones.parse({}).asociaciones).toBe("activas");
  });
});
