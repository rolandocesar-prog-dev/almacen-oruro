// Traducción de los errores del SDK a los motivos del sistema (F-007, research A-08; FR-015).
// No hace ninguna llamada: solo construye los errores tipados del SDK.
import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { ErrorDeRedaccion, MODELO_IA, motivoDeError } from "@/servicios/ia/redactor";

describe("motivoDeError (FR-015)", () => {
  it("una demora es «demora», aunque su clase extienda a la de conexión", () => {
    const demora = new Anthropic.APIConnectionTimeoutError();
    expect(demora).toBeInstanceOf(Anthropic.APIConnectionError);
    expect(motivoDeError(demora)).toBe("demora");
  });

  it("sin conexión es «sin-conexion»", () => {
    expect(motivoDeError(new Anthropic.APIConnectionError({ message: "fetch failed" }))).toBe("sin-conexion");
  });

  it("cualquier otro error del servicio se trata como servicio no disponible", () => {
    expect(motivoDeError(new Error("401 invalid x-api-key"))).toBe("sin-conexion");
  });

  it("un ErrorDeRedaccion conserva su motivo", () => {
    expect(motivoDeError(new ErrorDeRedaccion("formato"))).toBe("formato");
  });
});

describe("MODELO_IA", () => {
  it("es el que se guarda en cada informe", () => {
    expect(MODELO_IA).toBe("claude-opus-5");
  });
});
