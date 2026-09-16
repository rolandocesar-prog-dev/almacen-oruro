// Formato de números del módulo de IA (F-007).
import { describe, expect, it } from "vitest";
import { formatearPorcentaje, formatearUnDecimal } from "@/lib/numeros";

describe("formatearUnDecimal", () => {
  it("usa coma decimal y siempre un decimal", () => {
    expect(formatearUnDecimal(10.7)).toBe("10,7");
    expect(formatearUnDecimal(9)).toBe("9,0");
  });
});

describe("formatearPorcentaje", () => {
  it("convierte la proporción en porcentaje con un decimal", () => {
    expect(formatearPorcentaje(0.1234)).toBe("12,3 %");
  });

  it("sin valor dice «No aplica» (FR-009)", () => {
    expect(formatearPorcentaje(null)).toBe("No aplica");
  });
});
