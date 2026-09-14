import { describe, expect, it } from "vitest";
import {
  esFechaValida,
  formatearFechaHora,
  hoyEnLaPaz,
  inicioDelDiaEnLaPaz,
  inicioDelMesEnCurso,
  sumarHoras,
} from "@/lib/fechas";

describe("fechas en America/La_Paz (research R-12)", () => {
  it("devuelve hoy en formato AAAA-MM-DD", () => {
    expect(hoyEnLaPaz()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("a las 23:30 del 31/08 en La Paz (03:30 UTC del 01/09) la fecha sigue siendo 31/08", () => {
    const momento = new Date("2026-09-01T03:30:00Z");
    expect(hoyEnLaPaz(momento)).toBe("2026-08-31");
    expect(inicioDelMesEnCurso(momento)).toBe("2026-08-01");
  });

  it("el día en La Paz empieza a las 04:00 UTC", () => {
    expect(inicioDelDiaEnLaPaz("2026-09-13").toISOString()).toBe("2026-09-13T04:00:00.000Z");
  });

  it("suma horas", () => {
    expect(sumarHoras(new Date("2026-09-13T08:00:00Z"), 8).toISOString()).toBe("2026-09-13T16:00:00.000Z");
  });

  it("valida fechas AAAA-MM-DD", () => {
    expect(esFechaValida("2026-09-13")).toBe(true);
    expect(esFechaValida("2026-02-30")).toBe(false);
    expect(esFechaValida("13/09/2026")).toBe(false);
  });

  it("formatea fecha y hora en hora de Bolivia", () => {
    expect(formatearFechaHora(new Date("2026-09-14T01:05:00Z"))).toBe("13/09/2026 21:05");
  });
});
