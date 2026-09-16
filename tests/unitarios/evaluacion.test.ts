// Métricas y evaluación con validación reservada (F-007, Historia 3; FR-008, FR-009, SC-003).
import { describe, expect, it } from "vitest";
import { ajustarHoltWinters, pronosticarHoltWinters } from "@/servicios/ia/holt-winters";
import { evaluarProducto, mae, MOTIVO_NO_EVALUABLE, wape } from "@/servicios/ia/evaluacion";
import type { SerieDeConsumo } from "@/servicios/ia/serie";

const ESTACIONAL = [-20, -15, -5, 0, 10, 40, 50, 35, 5, -5, -15, -20];

function aSerie(valores: number[]): SerieDeConsumo {
  return valores.map((consumo, indice) => {
    const anio = 2023 + Math.floor(indice / 12);
    return { mes: `${anio}-${String((indice % 12) + 1).padStart(2, "0")}`, consumo };
  });
}

/** Estacionalidad y tendencia sin ruido: el ingenuo estacional llega tarde a la tendencia, el promedio no ve la estación. */
function serieConTendencia(meses = 36): number[] {
  return Array.from({ length: meses }, (_, i) => 100 + 2 * i + (ESTACIONAL[i % 12] ?? 0));
}

describe("mae y wape (FR-009)", () => {
  it("mae promedia los errores absolutos", () => {
    expect(mae([10, 12], [11, 10])).toBe(1.5);
  });

  it("wape divide la suma de errores entre la suma de lo consumido", () => {
    expect(wape([10, 12], [11, 10])).toBeCloseTo(3 / 21, 12);
  });

  it("wape no aplica cuando no se consumió nada en los meses de validación (H3 · E6)", () => {
    expect(wape([1, 2], [0, 0])).toBeNull();
  });
});

describe("evaluarProducto (FR-008)", () => {
  it("con estacionalidad y tendencia, Holt-Winters es el mejor (SC-003, H3 · E4)", () => {
    const resultado = evaluarProducto(aSerie(serieConTendencia()));

    expect(resultado.evaluable).toBe(true);
    if (!resultado.evaluable) return;
    expect(resultado.mejor).toBe("holt-winters");
    const porMetodo = Object.fromEntries(resultado.porMetodo.map((r) => [r.metodo, r.mae]));
    expect(porMetodo["holt-winters"]).toBeLessThan(porMetodo["promedio-movil"]!);
    expect(porMetodo["holt-winters"]).toBeLessThan(porMetodo["ingenuo-estacional"]!);
  });

  it("reserva los últimos 6 meses y ajusta solo con los anteriores (H3 · E1)", () => {
    const valores = serieConTendencia();
    const resultado = evaluarProducto(aSerie(valores));
    if (!resultado.evaluable) throw new Error("debía ser evaluable");

    expect(resultado.validacion.map((mes) => mes.real)).toEqual(valores.slice(30));
    expect(resultado.validacion[0]?.mes).toBe("2025-07");
    // El pronóstico de Holt-Winters es exactamente el que da un ajuste con los 30 primeros meses.
    const esperado = pronosticarHoltWinters(ajustarHoltWinters(valores.slice(0, 30)), 6);
    expect(resultado.porMetodo.find((r) => r.metodo === "holt-winters")?.pronosticos).toEqual(esperado);
  });

  it("cambiar los meses de validación no cambia los pronósticos: nunca los mira (aclaración del 13/09)", () => {
    const original = serieConTendencia();
    const alterada = [...original.slice(0, 30), 999, 0, 999, 0, 999, 0];
    const a = evaluarProducto(aSerie(original));
    const b = evaluarProducto(aSerie(alterada));
    if (!a.evaluable || !b.evaluable) throw new Error("debían ser evaluables");

    expect(b.porMetodo.map((r) => r.pronosticos)).toEqual(a.porMetodo.map((r) => r.pronosticos));
  });

  it("con menos de 30 meses no es evaluable y lo dice (H3 · E5)", () => {
    expect(evaluarProducto(aSerie(serieConTendencia(29)))).toEqual({ evaluable: false, motivo: MOTIVO_NO_EVALUABLE });
    expect(MOTIVO_NO_EVALUABLE).toBe("No evaluable: se necesitan al menos 30 meses");
  });

  it("un producto sin consumo en la validación tiene WAPE «No aplica» en los tres métodos", () => {
    const valores = [...serieConTendencia(30), 0, 0, 0, 0, 0, 0];
    const resultado = evaluarProducto(aSerie(valores));
    if (!resultado.evaluable) throw new Error("debía ser evaluable");
    expect(resultado.porMetodo.map((r) => r.wape)).toEqual([null, null, null]);
  });
});
