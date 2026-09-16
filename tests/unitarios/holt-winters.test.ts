// Método principal de pronóstico (F-007, research A-02; SC-003, FR-003, FR-004).
//
// Todo es aritmética sobre arreglos de números: estas pruebas no tocan la base ni la red.
import { describe, expect, it } from "vitest";
import {
  ajustarHoltWinters,
  ingenuoEstacional,
  promedioMovil,
  pronosticarHoltWinters,
} from "@/servicios/ia/holt-winters";

/** Factores estacionales de una serie inventada: el invierno del sur (junio a agosto) consume más. */
const ESTACIONAL = [0.8, 0.85, 0.95, 1.0, 1.1, 1.4, 1.5, 1.35, 1.05, 0.95, 0.85, 0.8];

/**
 * 36 meses de `base × factor del mes` sin nada de ruido: la estacionalidad es perfecta y un método que
 * la modela debería ganarle por lejos a uno que solo promedia (SC-003).
 */
function serieEstacionalPerfecta(base = 100, meses = 36): number[] {
  return Array.from({ length: meses }, (_, indice) => base * (ESTACIONAL[indice % 12] ?? 1));
}

/** Error absoluto medio entre dos arreglos del mismo largo. */
function errorMedio(pronosticos: number[], reales: number[]): number {
  const suma = pronosticos.reduce((total, valor, indice) => total + Math.abs(valor - (reales[indice] ?? 0)), 0);
  return suma / pronosticos.length;
}

describe("ajustarHoltWinters y pronosticarHoltWinters (SC-003, FR-003, FR-004)", () => {
  it("pronostica mejor que el promedio móvil sobre una serie con estacionalidad perfecta", () => {
    // Se reservan los últimos 6 meses igual que en la evaluación: se ajusta con los 30 anteriores.
    const serie = serieEstacionalPerfecta();
    const ajuste = serie.slice(0, 30);
    const validacion = serie.slice(30);

    const deHoltWinters = pronosticarHoltWinters(ajustarHoltWinters(ajuste), 6);
    const delPromedio = Array.from({ length: 6 }, () => promedioMovil(ajuste, 3));

    expect(errorMedio(deHoltWinters, validacion)).toBeLessThan(errorMedio(delPromedio, validacion));
  });

  it("es determinista: dos ejecuciones dan los mismos parámetros y el mismo pronóstico (FR-004)", () => {
    const serie = serieEstacionalPerfecta();
    const primero = ajustarHoltWinters(serie);
    const segundo = ajustarHoltWinters(serie);

    expect(primero.alfa).toBe(segundo.alfa);
    expect(primero.beta).toBe(segundo.beta);
    expect(primero.gamma).toBe(segundo.gamma);
    expect(pronosticarHoltWinters(primero, 3)).toEqual(pronosticarHoltWinters(segundo, 3));
  });

  it("prueba las 729 combinaciones de {0,1 … 0,9} y devuelve parámetros de esa rejilla (FR-003)", () => {
    const { alfa, beta, gamma, combinacionesProbadas } = ajustarHoltWinters(serieEstacionalPerfecta());

    expect(combinacionesProbadas).toBe(729);
    for (const parametro of [alfa, beta, gamma]) {
      expect(parametro).toBeGreaterThanOrEqual(0.1);
      expect(parametro).toBeLessThanOrEqual(0.9);
      // Los parámetros salen de la rejilla de un decimal: 0,1 · 0,2 … 0,9.
      expect(Math.round(parametro * 10)).toBeCloseTo(parametro * 10, 10);
    }
  });

  it("ante un empate elige los valores más bajos en orden α, β, γ (FR-003)", () => {
    // Serie constante: todas las combinaciones aciertan igual (MAE 0), así que todo es empate.
    const constante = Array.from({ length: 36 }, () => 50);
    const ajuste = ajustarHoltWinters(constante);

    expect([ajuste.alfa, ajuste.beta, ajuste.gamma]).toEqual([0.1, 0.1, 0.1]);
  });

  it("nunca pronostica una cantidad negativa: un consumo no puede ser menor que 0", () => {
    // Serie en caída fuerte: la tendencia extrapolada se iría por debajo de cero.
    const enCaida = Array.from({ length: 36 }, (_, indice) => Math.max(0, 400 - indice * 12));
    const pronosticos = pronosticarHoltWinters(ajustarHoltWinters(enCaida), 12);

    expect(pronosticos).toHaveLength(12);
    for (const valor of pronosticos) expect(valor).toBeGreaterThanOrEqual(0);
  });

  it("con menos de dos años de datos no puede estimar la estacionalidad y lo dice", () => {
    expect(() => ajustarHoltWinters([10, 12, 9])).toThrow(/24 meses/);
  });
});

describe("promedioMovil (método de referencia)", () => {
  it("promedia los últimos meses de la ventana", () => {
    expect(promedioMovil([10, 20, 30, 40, 50], 3)).toBe(40);
  });

  it("con una ventana mayor que la serie usa los meses disponibles", () => {
    expect(promedioMovil([10, 20], 3)).toBe(15);
  });

  it("sin datos devuelve 0", () => {
    expect(promedioMovil([], 3)).toBe(0);
  });
});

describe("ingenuoEstacional (método de referencia)", () => {
  it("repite el mismo mes del año anterior", () => {
    const serie = serieEstacionalPerfecta();
    // Los 6 pronósticos siguientes al mes 30 son los meses 18 a 23 (12 atrás).
    expect(ingenuoEstacional(serie.slice(0, 30), 6)).toEqual(serie.slice(18, 24));
  });

  it("con menos de un año de historia repite el último valor conocido", () => {
    expect(ingenuoEstacional([10, 20, 30], 2)).toEqual([30, 30]);
  });

  it("sin datos devuelve ceros", () => {
    expect(ingenuoEstacional([], 3)).toEqual([0, 0, 0]);
  });
});
