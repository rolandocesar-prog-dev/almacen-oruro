import { describe, expect, it } from "vitest";
import { nombreArchivoRespaldo } from "@/servicios/respaldo";

describe("nombreArchivoRespaldo (FR-017, research O-10)", () => {
  it("lleva el sistema, la fecha y la hora de Oruro (UTC−4)", () => {
    expect(nombreArchivoRespaldo(new Date("2026-09-26T11:15:00Z"))).toBe("respaldo-almacen-oruro-2026-09-26-0715.sql");
  });

  it("completa con cero la hora y los minutos de un dígito", () => {
    expect(nombreArchivoRespaldo(new Date("2026-01-05T13:04:00Z"))).toBe("respaldo-almacen-oruro-2026-01-05-0904.sql");
  });

  it("usa el día de Oruro aunque en UTC ya sea el día siguiente", () => {
    expect(nombreArchivoRespaldo(new Date("2026-09-27T03:30:00Z"))).toBe("respaldo-almacen-oruro-2026-09-26-2330.sql");
  });
});
