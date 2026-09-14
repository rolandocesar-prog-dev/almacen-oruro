import { describe, expect, it } from "vitest";
import { z, type ZodType } from "zod";
import { esquemaCentroSalud } from "@/esquemas/catalogos/centro-salud";
import { esquemaRepresentante } from "@/esquemas/catalogos/representante";

function erroresDe(esquema: ZodType, datos: Record<string, unknown>): Partial<Record<string, string[]>> {
  const resultado = esquema.safeParse(datos);
  return resultado.success ? {} : z.flattenError(resultado.error).fieldErrors;
}

const MENSAJE_CI = "Usa dígitos y, si tiene complemento, un guion: 4567890-1B";

describe("esquemaCentroSalud (FR-009)", () => {
  it("acepta el nombre con teléfono y dirección vacíos", () => {
    expect(esquemaCentroSalud.parse({ nombre: " Hospital General San Juan de Dios ", telefono: "", direccion: "" })).toEqual({
      nombre: "Hospital General San Juan de Dios",
    });
  });

  it("exige el nombre hasta 100 caracteres y valida los opcionales", () => {
    expect(erroresDe(esquemaCentroSalud, { nombre: "" }).nombre).toEqual(["Escribe el nombre"]);
    expect(erroresDe(esquemaCentroSalud, { nombre: "a".repeat(101) }).nombre).toEqual(["El nombre admite hasta 100 caracteres"]);
    expect(erroresDe(esquemaCentroSalud, { nombre: "Centro", telefono: "52-abc" }).telefono).toEqual([
      "El teléfono solo admite dígitos, espacios, + y -",
    ]);
    expect(erroresDe(esquemaCentroSalud, { nombre: "Centro", direccion: "a".repeat(151) }).direccion).toEqual([
      "La dirección admite hasta 150 caracteres",
    ]);
  });
});

describe("esquemaRepresentante (FR-010, FR-022)", () => {
  const datosValidos = { nombre: "Ana", apellido: "Quispe", ci: " 4567890-1b ", servicio: "Enfermería", telefono: "", centroSaludId: "1" };

  it("acepta datos válidos y pasa el CI a mayúsculas", () => {
    expect(esquemaRepresentante.parse(datosValidos)).toEqual({
      nombre: "Ana",
      apellido: "Quispe",
      ci: "4567890-1B",
      servicio: "Enfermería",
      centroSaludId: 1,
    });
    expect(esquemaRepresentante.parse({ ...datosValidos, ci: "4567890" }).ci).toBe("4567890");
  });

  it.each(["ABC123", "4567890 1B", "1".repeat(16)])("rechaza el CI %s", (ci) => {
    expect(erroresDe(esquemaRepresentante, { ...datosValidos, ci }).ci).toEqual([MENSAJE_CI]);
  });

  it("exige nombre, apellido y servicio hasta 60 caracteres", () => {
    const errores = erroresDe(esquemaRepresentante, { ...datosValidos, nombre: "", apellido: "a".repeat(61), servicio: " " });
    expect(errores.nombre).toEqual(["Escribe el nombre"]);
    expect(errores.apellido).toEqual(["El apellido admite hasta 60 caracteres"]);
    expect(errores.servicio).toEqual(["Escribe el servicio"]);
  });

  it("exige elegir el centro de salud", () => {
    expect(erroresDe(esquemaRepresentante, { ...datosValidos, centroSaludId: "" }).centroSaludId).toEqual(["Elige un centro de salud"]);
  });
});
