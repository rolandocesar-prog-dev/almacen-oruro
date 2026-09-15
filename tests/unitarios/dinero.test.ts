import { describe, expect, it } from "vitest";
import { aCentavos, formatearBolivianos, formatearCentavos } from "@/lib/dinero";

describe("aCentavos (research K-04)", () => {
  it("acepta coma o punto y hasta 2 decimales", () => {
    expect(aCentavos("12,5")).toBe(1250);
    expect(aCentavos("12,50")).toBe(1250);
    expect(aCentavos("12.50")).toBe(1250);
    expect(aCentavos("0,05")).toBe(5);
    expect(aCentavos(" 30 ")).toBe(3000);
    expect(aCentavos("9999999999,99")).toBe(999999999999);
  });

  it.each(["12,505", "abc", "", "-3", "1.234,50", "12345678901"])("rechaza '%s'", (texto) => {
    expect(aCentavos(texto)).toBeNull();
  });

  it("suma sin errores de coma flotante: 10 × 12,50 + 4 × 30,00 = Bs 245,00", () => {
    const total = 10 * aCentavos("12,50")! + 4 * aCentavos("30,00")!;
    expect(total).toBe(24500);
    expect(formatearCentavos(total)).toBe("Bs 245,00");
    expect(formatearCentavos(aCentavos("0,1")! + aCentavos("0,2")!)).toBe("Bs 0,30");
  });
});

describe("formatos en bolivianos", () => {
  it("formatea centavos con separador de miles y coma decimal", () => {
    expect(formatearCentavos(123450)).toBe("Bs 1.234,50");
    expect(formatearCentavos(5)).toBe("Bs 0,05");
  });

  it("formatearBolivianos sigue dando el mismo formato", () => {
    expect(formatearBolivianos("245.00")).toBe("Bs 245,00");
    expect(formatearBolivianos(null)).toBe("—");
  });
});
