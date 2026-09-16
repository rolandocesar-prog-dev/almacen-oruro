// Texto guardado de un Informe IA (F-007, data-model §4; FR-012).
import { describe, expect, it } from "vitest";
import { seccionesDeTexto, textoDeSecciones } from "@/servicios/ia/texto-informe";

describe("textoDeSecciones y seccionesDeTexto", () => {
  it("escribe las cuatro secciones con sus títulos y las vuelve a leer igual", () => {
    const texto = textoDeSecciones({
      resumen: "Se gastaron Bs 1.200,00 en 3 compras.",
      hallazgos: ["El gasto subió 20 %.", "Un proveedor concentra la mitad."],
      alertas: ["Hay 2 productos bajo mínimo."],
      recomendaciones: ["Reponer lavandina."],
    });

    expect(texto).toBe(
      [
        "Resumen\nSe gastaron Bs 1.200,00 en 3 compras.",
        "Hallazgos\n- El gasto subió 20 %.\n- Un proveedor concentra la mitad.",
        "Alertas\n- Hay 2 productos bajo mínimo.",
        "Recomendaciones\n- Reponer lavandina.",
      ].join("\n\n"),
    );
    expect(seccionesDeTexto(texto)).toEqual([
      { titulo: "Resumen", parrafos: ["Se gastaron Bs 1.200,00 en 3 compras."], vinetas: [] },
      { titulo: "Hallazgos", parrafos: [], vinetas: ["El gasto subió 20 %.", "Un proveedor concentra la mitad."] },
      { titulo: "Alertas", parrafos: [], vinetas: ["Hay 2 productos bajo mínimo."] },
      { titulo: "Recomendaciones", parrafos: [], vinetas: ["Reponer lavandina."] },
    ]);
  });

  it("una sección vacía se escribe con su frase «Sin … en el período» (FR-012)", () => {
    const secciones = seccionesDeTexto(textoDeSecciones({ resumen: "Mes tranquilo.", hallazgos: [], alertas: [], recomendaciones: [] }));
    expect(secciones.map((s) => s.parrafos)).toEqual([
      ["Mes tranquilo."],
      ["Sin hallazgos en el período"],
      ["Sin alertas en el período"],
      ["Sin recomendaciones en el período"],
    ]);
  });
});
