import { describe, expect, it } from "vitest";
import { mensajesPorLinea } from "@/componentes/formularios/errores-de-lineas";

describe("mensajesPorLinea", () => {
  it("antepone el número de línea a los errores de un campo de la línea", () => {
    expect(mensajesPorLinea({ "lineas.1.cantidad": ["La cantidad debe ser un número entero entre 1 y 1.000.000"] })).toEqual([
      "Línea 2: la cantidad debe ser un número entero entre 1 y 1.000.000",
    ]);
  });

  it("no repite el número si el mensaje ya empieza con «Línea»", () => {
    expect(mensajesPorLinea({ "lineas.2.productoId": ["Línea 3: el producto ya está en la línea 1; modifica su cantidad"] })).toEqual([
      "Línea 3: el producto ya está en la línea 1; modifica su cantidad",
    ]);
  });

  it("deja tal cual los errores de la lista y omite los de la cabecera", () => {
    expect(mensajesPorLinea({ lineas: ["Agrega al menos un producto"], fecha: ["Escribe una fecha válida"] })).toEqual(["Agrega al menos un producto"]);
  });
});
