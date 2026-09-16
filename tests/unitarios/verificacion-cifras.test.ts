// Resaltado de cifras que no están en los datos (F-007, FR-025).
import { describe, expect, it } from "vitest";
import { contarCifrasNoEncontradas, marcarCifras, numerosDeLosDatos } from "@/servicios/ia/verificacion-cifras";

const DATOS = {
  periodo: { desde: "2026-08-01", hasta: "2026-08-31" },
  totales: { totalGastado: "1234.50", compras: 8, variacionGastoPorcentual: -25.7 },
  topProductos: [{ codigo: "LIM-001", producto: "Lavandina 1 L", unidades: 1452, pronostico: 81.66 }],
};
const NUMEROS = numerosDeLosDatos(DATOS);

/** Solo las cifras marcadas de una línea. */
const marcadas = (linea: string) => marcarCifras(linea, NUMEROS).filter((f) => f.noEncontrada).map((f) => f.texto);

describe("marcarCifras (FR-025)", () => {
  it("no marca las cifras que están en los datos, escritas a la española", () => {
    expect(marcadas("Se gastaron Bs 1.234,50 en 8 compras y se entregaron 1.452 unidades.")).toEqual([]);
  });

  it("marca la cifra inventada y deja el resto del texto intacto", () => {
    const fragmentos = marcarCifras("Se hicieron 9 compras por Bs 1.234,50.", NUMEROS);
    expect(fragmentos).toEqual([
      { texto: "Se hicieron " },
      { texto: "9", noEncontrada: true },
      { texto: " compras por Bs 1.234,50." },
    ]);
    expect(fragmentos.map((f) => f.texto).join("")).toBe("Se hicieron 9 compras por Bs 1.234,50.");
  });

  it("acepta el redondeo a un decimal y la variación sin signo", () => {
    expect(marcadas("El pronóstico es de 81,7 unidades y el gasto bajó 25,7 %.")).toEqual([]);
    expect(marcadas("El pronóstico es de 82,5 unidades.")).toEqual(["82,5"]);
  });

  it("ignora fechas, años y la numeración de listas", () => {
    expect(marcadas("Del 01/08/2026 al 31/08/2026, frente a agosto de 2025.")).toEqual([]);
    expect(marcadas("Período 2026-08-01 a 2026-08-31.")).toEqual([]);
    expect(marcadas("3. Reponer lavandina.")).toEqual([]);
  });

  it("reconoce los números que forman parte de nombres y códigos de los datos", () => {
    expect(marcadas("La Lavandina 1 L (LIM-001) fue la más distribuida.")).toEqual([]);
  });

  it("cuenta las cifras no encontradas de todo el texto", () => {
    expect(contarCifrasNoEncontradas("Resumen\nHubo 8 compras y 3 proveedores.\n\nAlertas\n- Faltan 40 unidades.", DATOS)).toBe(2);
  });
});
