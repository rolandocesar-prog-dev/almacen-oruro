// Aleatoriedad sembrada del generador de histórico (F-007, FR-019).
import { describe, expect, it } from "vitest";
import { elegirDe, enteroEntre, generadorAleatorio } from "@/lib/aleatorio";

function primeros(semilla: number, cantidad = 20): number[] {
  const aleatorio = generadorAleatorio(semilla);
  return Array.from({ length: cantidad }, () => aleatorio());
}

describe("generadorAleatorio (FR-019)", () => {
  it("la misma semilla produce siempre la misma secuencia", () => {
    expect(primeros(20260915)).toEqual(primeros(20260915));
  });

  it("semillas distintas producen secuencias distintas", () => {
    expect(primeros(42)).not.toEqual(primeros(43));
  });

  it("todos los valores caen en [0, 1)", () => {
    for (const valor of primeros(20260915, 1000)) {
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(1);
    }
  });
});

describe("enteroEntre y elegirDe", () => {
  it("enteroEntre devuelve enteros dentro del rango, extremos incluidos", () => {
    const aleatorio = generadorAleatorio(7);
    const valores = Array.from({ length: 500 }, () => enteroEntre(aleatorio, 3, 6));

    for (const valor of valores) {
      expect(Number.isInteger(valor)).toBe(true);
      expect(valor).toBeGreaterThanOrEqual(3);
      expect(valor).toBeLessThanOrEqual(6);
    }
    // Con 500 tiradas sobre cuatro valores, los cuatro tienen que haber salido.
    expect(new Set(valores)).toEqual(new Set([3, 4, 5, 6]));
  });

  it("elegirDe siempre devuelve un elemento de la lista", () => {
    const aleatorio = generadorAleatorio(11);
    const opciones = ["a", "b", "c"] as const;

    for (let intento = 0; intento < 100; intento += 1) {
      expect(opciones).toContain(elegirDe(aleatorio, opciones));
    }
  });
});
