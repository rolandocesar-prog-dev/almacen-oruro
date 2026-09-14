import { describe, expect, it } from "vitest";
import { z } from "zod";
import { esquemaCambioContrasena, esquemaRestablecimiento } from "@/esquemas/personal";

function errores(esquema: z.ZodType, datos: Record<string, unknown>): Partial<Record<string, string[]>> {
  const resultado = esquema.safeParse(datos);
  return resultado.success ? {} : z.flattenError(resultado.error).fieldErrors;
}

describe("esquemaCambioContrasena (FR-019)", () => {
  const validos = { contrasenaActual: "actual-123", contrasenaNueva: "nueva-1234", confirmacion: "nueva-1234" };

  it("acepta datos válidos sin recortar las contraseñas", () => {
    const datos = esquemaCambioContrasena.parse({ ...validos, contrasenaNueva: " nueva-1234 ", confirmacion: " nueva-1234 " });
    expect(datos.contrasenaNueva).toBe(" nueva-1234 ");
  });

  it("exige la contraseña actual", () => {
    expect(errores(esquemaCambioContrasena, { ...validos, contrasenaActual: "" }).contrasenaActual).toEqual([
      "Escribe tu contraseña actual",
    ]);
  });

  it("exige al menos 8 caracteres y que la confirmación coincida", () => {
    expect(errores(esquemaCambioContrasena, { ...validos, contrasenaNueva: "corta", confirmacion: "corta" }).contrasenaNueva).toEqual([
      "La contraseña debe tener al menos 8 caracteres",
    ]);
    expect(errores(esquemaCambioContrasena, { ...validos, confirmacion: "otra-cosa" }).confirmacion).toEqual([
      "Las contraseñas no coinciden",
    ]);
  });
});

describe("esquemaRestablecimiento (FR-020)", () => {
  it("exige una temporal de al menos 8 caracteres confirmada", () => {
    expect(errores(esquemaRestablecimiento, { contrasenaTemporal: "1234567", confirmacion: "1234567" }).contrasenaTemporal).toEqual([
      "La contraseña debe tener al menos 8 caracteres",
    ]);
    expect(errores(esquemaRestablecimiento, { contrasenaTemporal: "temporal123", confirmacion: "temporal124" }).confirmacion).toEqual([
      "Las contraseñas no coinciden",
    ]);
    expect(esquemaRestablecimiento.safeParse({ contrasenaTemporal: "temporal123", confirmacion: "temporal123" }).success).toBe(true);
  });
});
