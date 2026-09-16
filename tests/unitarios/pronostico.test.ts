// Elección de método, pronóstico y reposición sugerida (F-007, Historia 2; FR-002, FR-005).
import { describe, expect, it } from "vitest";
import { metodoParaSerie, pronosticarProducto, reposicionSugerida } from "@/servicios/ia/pronostico";
import type { SerieDeConsumo } from "@/servicios/ia/serie";

/** Serie de `meses` meses desde enero de 2024 con los consumos que devuelva `valor`. */
function serie(meses: number, valor: (indice: number) => number = () => 10): SerieDeConsumo {
  return Array.from({ length: meses }, (_, indice) => {
    const anio = 2024 + Math.floor(indice / 12);
    const mes = (indice % 12) + 1;
    return { mes: `${anio}-${String(mes).padStart(2, "0")}`, consumo: valor(indice) };
  });
}

describe("metodoParaSerie (FR-002)", () => {
  it("usa Holt-Winters con 24 meses o más", () => {
    expect(metodoParaSerie(serie(24))).toBe("holt-winters");
    expect(metodoParaSerie(serie(36))).toBe("holt-winters");
  });

  it("usa el promedio móvil entre 3 y 23 meses", () => {
    expect(metodoParaSerie(serie(3))).toBe("promedio-movil");
    expect(metodoParaSerie(serie(23))).toBe("promedio-movil");
  });

  it("promedia los meses disponibles con 1 o 2 meses", () => {
    expect(metodoParaSerie(serie(1))).toBe("promedio-disponible");
    expect(metodoParaSerie(serie(2))).toBe("promedio-disponible");
  });

  it("sin consumo no hay historial: ni una serie vacía ni una de ceros alcanzan", () => {
    expect(metodoParaSerie([])).toBe("sin-historial");
    expect(metodoParaSerie(serie(30, () => 0))).toBe("sin-historial");
  });
});

describe("pronosticarProducto (FR-002, FR-003)", () => {
  it("con poca historia promedia los últimos 3 meses, a un decimal", () => {
    expect(pronosticarProducto(serie(5, (i) => [1, 1, 10, 11, 11][i] ?? 0))).toEqual({
      metodo: "promedio-movil",
      etiqueta: "Promedio móvil (3 meses)",
      pronostico: 10.7,
    });
  });

  it("con 1 o 2 meses promedia los que hay", () => {
    expect(pronosticarProducto(serie(2, (i) => [4, 7][i] ?? 0)).pronostico).toBe(5.5);
  });

  it("sin historial pronostica 0", () => {
    expect(pronosticarProducto([])).toEqual({ metodo: "sin-historial", etiqueta: "Sin historial", pronostico: 0 });
  });

  it("con dos años o más usa Holt-Winters y siempre da lo mismo (FR-004)", () => {
    const larga = serie(36, (i) => 20 + (i % 12 >= 5 && i % 12 <= 7 ? 15 : 0));
    const primero = pronosticarProducto(larga);

    expect(primero.metodo).toBe("holt-winters");
    expect(primero.etiqueta).toBe("Holt-Winters");
    expect(pronosticarProducto(larga)).toEqual(primero);
    expect(Math.round(primero.pronostico * 10)).toBe(primero.pronostico * 10);
  });
});

describe("reposicionSugerida (FR-005)", () => {
  it("pronóstico 40, mínimo 10 y stock 35 → 15 (H2 · E3)", () => {
    expect(reposicionSugerida(40, 10, 35)).toBe(15);
  });

  it("con stock mayor que pronóstico + mínimo no sugiere comprar (H2 · E4)", () => {
    expect(reposicionSugerida(40, 10, 80)).toBe(0);
  });

  it("sin historial queda en máx(0, mínimo − stock) (H2 · E7)", () => {
    expect(reposicionSugerida(0, 10, 4)).toBe(6);
    expect(reposicionSugerida(0, 10, 25)).toBe(0);
  });

  it("redondea hacia arriba: no se compra media unidad", () => {
    expect(reposicionSugerida(12.3, 10, 5)).toBe(18);
    expect(Number.isInteger(reposicionSugerida(7.1, 3, 2))).toBe(true);
  });

  it("un error de coma flotante no sugiere comprar una unidad de más", () => {
    // 20,1 + 10 − 30,1 da 0,0000000000000036 en coma flotante: la reposición correcta es 0.
    expect(reposicionSugerida(20.1, 10, 30.1)).toBe(0);
  });
});
