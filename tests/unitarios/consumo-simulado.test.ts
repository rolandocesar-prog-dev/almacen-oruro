// Consumo objetivo del generador de histórico (F-007, FR-019, spec H1 · E3).
//
// Es una función pura: no toca la base. Aquí se comprueba que la serie que se va a generar tenga de
// verdad la forma que promete la especificación —estacionalidad, tendencia y ruido acotado—, algo que
// con 6 meses de prueba de integración no se puede ver.
import { describe, expect, it } from "vitest";
import { generadorAleatorio } from "@/lib/aleatorio";
import { objetivoDeConsumo } from "@/servicios/ia/generador";

/** Generador neutro: 0,5 deja el ruido en 1, así se ve la señal sin el ruido encima. */
const sinRuido = () => 0.5;

const MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const INVIERNO = [6, 7, 8];

function promedio(valores: number[]): number {
  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

describe("objetivoDeConsumo (FR-019)", () => {
  it("junio, julio y agosto consumen más que el resto del año (S-06)", () => {
    const deInvierno = INVIERNO.map((mes) => objetivoDeConsumo(100, mes, 0, sinRuido));
    const delResto = MESES.filter((mes) => !INVIERNO.includes(mes)).map((mes) => objetivoDeConsumo(100, mes, 0, sinRuido));

    expect(promedio(deInvierno)).toBeGreaterThan(promedio(delResto));
    // Y no es por un solo mes: el más bajo del invierno supera al más alto de los otros nueve.
    expect(Math.min(...deInvierno)).toBeGreaterThan(Math.max(...delResto));
  });

  it("crece un 3 % por año", () => {
    for (const mes of MESES) {
      const primerAnio = objetivoDeConsumo(100, mes, 0, sinRuido);
      const segundoAnio = objetivoDeConsumo(100, mes, 1, sinRuido);
      expect(segundoAnio / primerAnio).toBeCloseTo(1.03, 10);
    }
    expect(objetivoDeConsumo(100, 6, 2, sinRuido) / objetivoDeConsumo(100, 6, 0, sinRuido)).toBeCloseTo(1.03 ** 2, 10);
  });

  it("el ruido nunca se aparta más del 15 % del valor sin ruido", () => {
    const aleatorio = generadorAleatorio(20260915);
    const esperado = objetivoDeConsumo(100, 4, 0, sinRuido);

    for (let intento = 0; intento < 1000; intento += 1) {
      const valor = objetivoDeConsumo(100, 4, 0, aleatorio);
      expect(Math.abs(valor - esperado) / esperado).toBeLessThanOrEqual(0.15);
    }
  });

  it("con la misma semilla produce siempre la misma secuencia de consumos", () => {
    const serie = (semilla: number) => {
      const aleatorio = generadorAleatorio(semilla);
      return MESES.map((mes) => objetivoDeConsumo(50, mes, 1, aleatorio));
    };
    expect(serie(42)).toEqual(serie(42));
    expect(serie(42)).not.toEqual(serie(43));
  });
});
