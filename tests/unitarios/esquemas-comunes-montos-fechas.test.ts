import { afterEach, describe, expect, it, vi } from "vitest";
import { fechaDeFiltro, fechaNoFutura, fechaOpcionalDeFiltro, montoPositivo } from "@/esquemas/comunes";

const MENSAJE = "Escribe un precio mayor que 0 con hasta 2 decimales";

describe("montoPositivo (research K-04)", () => {
  const esquema = montoPositivo(MENSAJE);

  it("acepta coma o punto y devuelve el texto con punto", () => {
    expect(esquema.parse("12,50")).toBe("12.50");
    expect(esquema.parse(" 30 ")).toBe("30");
  });

  it.each(["0", "0,00", "12,505", "", "abc", "-1", "12345678901"])("rechaza '%s'", (texto) => {
    const resultado = esquema.safeParse(texto);
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe(MENSAJE);
  });
});

describe("fechaNoFutura (research K-06)", () => {
  const esquema = fechaNoFutura("La fecha de la compra no puede ser futura");

  afterEach(() => {
    vi.useRealTimers();
  });

  it("acepta hoy y rechaza mañana y fechas inexistentes", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-14T15:00:00-04:00"));

    expect(esquema.parse("2026-09-14")).toBe("2026-09-14");
    expect(esquema.safeParse("2026-09-15").error?.issues[0]?.message).toBe("La fecha de la compra no puede ser futura");
    expect(esquema.safeParse("2026-02-30").error?.issues[0]?.message).toBe("Escribe una fecha válida");
    expect(esquema.safeParse("").error?.issues[0]?.message).toBe("Escribe una fecha válida");
  });

  it("a las 21:30 de La Paz (01:30 UTC del día siguiente) hoy sigue siendo el día de La Paz", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-15T01:30:00Z"));

    expect(esquema.safeParse("2026-09-14").success).toBe(true);
    expect(esquema.safeParse("2026-09-15").success).toBe(false);
  });

  it("a las 00:30 de La Paz se acepta la fecha del día anterior", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-15T04:30:00Z"));

    expect(esquema.safeParse("2026-09-14").success).toBe(true);
    expect(esquema.safeParse("2026-09-15").success).toBe(true);
    expect(esquema.safeParse("2026-09-16").success).toBe(false);
  });
});

describe("fechas de filtros", () => {
  it("con valor por defecto lo usa; sin él queda sin valor", () => {
    expect(fechaDeFiltro(() => "2026-09-01").parse(undefined)).toBe("2026-09-01");
    expect(fechaDeFiltro(() => "2026-09-01").parse("")).toBe("2026-09-01");
    expect(fechaOpcionalDeFiltro().parse("")).toBeUndefined();
    expect(fechaOpcionalDeFiltro().safeParse("2026-13-01").error?.issues[0]?.message).toBe("Usa una fecha válida");
  });
});
