import { describe, expect, it } from "vitest";
import { z } from "zod";
import { esquemaFiltroPersonal, esquemaRegistroPersonal } from "@/esquemas/personal";

const datosValidos = {
  nombre: "Juan",
  apellido: "Pérez",
  cargo: "Auxiliar de almacén",
  direccion: "",
  telefono: "",
  nombreUsuario: " JPerez ",
  contrasena: "almacen2026",
  confirmacion: "almacen2026",
};

function erroresDe(datos: Record<string, unknown>) {
  const resultado = esquemaRegistroPersonal.safeParse(datos);
  return resultado.success ? {} : z.flattenError(resultado.error).fieldErrors;
}

describe("esquemaRegistroPersonal (FR-010, FR-011, FR-013)", () => {
  it("acepta datos válidos, pasa el usuario a minúsculas y deja vacíos los opcionales", () => {
    const datos = esquemaRegistroPersonal.parse(datosValidos);
    expect(datos.nombreUsuario).toBe("jperez");
    expect(datos.direccion).toBeUndefined();
    expect(datos.telefono).toBeUndefined();
  });

  it("rechaza nombre, apellido y cargo vacíos o de más de 60 caracteres", () => {
    expect(erroresDe({ ...datosValidos, nombre: "  " }).nombre).toEqual(["Escribe el nombre"]);
    expect(erroresDe({ ...datosValidos, apellido: "a".repeat(61) }).apellido).toEqual(["El apellido admite hasta 60 caracteres"]);
    expect(erroresDe({ ...datosValidos, cargo: "" }).cargo).toEqual(["Escribe el cargo"]);
  });

  it("rechaza dirección de más de 150 caracteres", () => {
    expect(erroresDe({ ...datosValidos, direccion: "a".repeat(151) }).direccion).toEqual(["La dirección admite hasta 150 caracteres"]);
  });

  it("rechaza teléfono con letras o de más de 20 caracteres", () => {
    expect(erroresDe({ ...datosValidos, telefono: "77abc" }).telefono).toEqual(["El teléfono solo admite dígitos, espacios, + y -"]);
    expect(erroresDe({ ...datosValidos, telefono: "1".repeat(21) }).telefono).toEqual(["El teléfono admite hasta 20 caracteres"]);
    expect(erroresDe({ ...datosValidos, telefono: "+591 7-123 4567" }).telefono).toBeUndefined();
  });

  it("rechaza nombres de usuario de 2 o 31 caracteres, con espacios internos o tildes", () => {
    const mensaje = ["Usa de 3 a 30 caracteres: letras minúsculas sin tildes, dígitos, punto o guion bajo"];
    expect(erroresDe({ ...datosValidos, nombreUsuario: "jp" }).nombreUsuario).toEqual(mensaje);
    expect(erroresDe({ ...datosValidos, nombreUsuario: "a".repeat(31) }).nombreUsuario).toEqual(mensaje);
    expect(erroresDe({ ...datosValidos, nombreUsuario: "juan perez" }).nombreUsuario).toEqual(mensaje);
    expect(erroresDe({ ...datosValidos, nombreUsuario: "juan-pérez" }).nombreUsuario).toEqual(mensaje);
    expect(erroresDe({ ...datosValidos, nombreUsuario: "" }).nombreUsuario).toEqual(["Escribe el nombre de usuario"]);
  });

  it("rechaza contraseña de 7 caracteres y confirmación distinta", () => {
    expect(erroresDe({ ...datosValidos, contrasena: "1234567", confirmacion: "1234567" }).contrasena).toEqual([
      "La contraseña debe tener al menos 8 caracteres",
    ]);
    expect(erroresDe({ ...datosValidos, confirmacion: "otra-cosa" }).confirmacion).toEqual(["Las contraseñas no coinciden"]);
  });
});

describe("esquemaFiltroPersonal", () => {
  it("un estado desconocido pasa a activos", () => {
    expect(esquemaFiltroPersonal.parse({ estado: "cualquiera" }).estado).toBe("activos");
    expect(esquemaFiltroPersonal.parse({}).estado).toBe("activos");
  });

  it("rechaza una búsqueda de más de 60 caracteres", () => {
    const resultado = esquemaFiltroPersonal.safeParse({ q: "a".repeat(61), estado: "todos" });
    expect(resultado.success).toBe(false);
  });
});
