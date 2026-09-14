import { describe, expect, it } from "vitest";
import { z } from "zod";
import { esquemaProveedor } from "@/esquemas/catalogos/proveedor";

const datosValidos = {
  razonSocial: "Distribuidora Andina S.R.L.",
  nit: " 1020304050 ",
  contactoNombre: "",
  telefono: "",
  correo: "",
  direccion: "",
};

function erroresDe(datos: Record<string, unknown>): Partial<Record<string, string[]>> {
  const resultado = esquemaProveedor.safeParse(datos);
  return resultado.success ? {} : z.flattenError(resultado.error).fieldErrors;
}

describe("esquemaProveedor (FR-008, FR-019)", () => {
  it("acepta datos válidos con los opcionales vacíos", () => {
    expect(esquemaProveedor.parse(datosValidos)).toEqual({ razonSocial: "Distribuidora Andina S.R.L.", nit: "1020304050" });
  });

  it("exige la razón social, hasta 100 caracteres", () => {
    expect(erroresDe({ ...datosValidos, razonSocial: " " }).razonSocial).toEqual(["Escribe la razón social"]);
    expect(erroresDe({ ...datosValidos, razonSocial: "a".repeat(101) }).razonSocial).toEqual(["La razón social admite hasta 100 caracteres"]);
  });

  it.each(["10203-04", "1.020", "ABC"])("rechaza el NIT %s", (nit) => {
    expect(erroresDe({ ...datosValidos, nit }).nit).toEqual(["El NIT solo admite dígitos"]);
  });

  it("exige el NIT y admite hasta 20 dígitos", () => {
    expect(erroresDe({ ...datosValidos, nit: "" }).nit).toEqual(["Escribe el NIT"]);
    expect(erroresDe({ ...datosValidos, nit: "1".repeat(21) }).nit).toEqual(["El NIT admite hasta 20 dígitos"]);
  });

  it("valida el formato del correo y lo guarda en minúsculas", () => {
    expect(erroresDe({ ...datosValidos, correo: "ventas@" }).correo).toEqual(["Escribe un correo con el formato nombre@dominio.com"]);
    expect(esquemaProveedor.parse({ ...datosValidos, correo: " Ventas@Andina.BO " }).correo).toBe("ventas@andina.bo");
  });

  it("valida contacto, teléfono y dirección opcionales", () => {
    expect(erroresDe({ ...datosValidos, contactoNombre: "a".repeat(81) }).contactoNombre).toEqual([
      "El nombre de contacto admite hasta 80 caracteres",
    ]);
    expect(erroresDe({ ...datosValidos, telefono: "abc" }).telefono).toEqual(["El teléfono solo admite dígitos, espacios, + y -"]);
    expect(erroresDe({ ...datosValidos, direccion: "a".repeat(151) }).direccion).toEqual(["La dirección admite hasta 150 caracteres"]);
    expect(esquemaProveedor.parse({ ...datosValidos, telefono: "+591 2 5251234", contactoNombre: "Rosa Mamani" })).toMatchObject({
      telefono: "+591 2 5251234",
      contactoNombre: "Rosa Mamani",
    });
  });
});
