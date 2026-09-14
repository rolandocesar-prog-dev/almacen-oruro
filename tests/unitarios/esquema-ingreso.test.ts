import { describe, expect, it } from "vitest";
import { esquemaIngreso } from "@/esquemas/acceso";

describe("esquemaIngreso (FR-002)", () => {
  it("recorta y pasa a minúsculas el nombre de usuario", () => {
    const resultado = esquemaIngreso.parse({ nombreUsuario: " ADMIN ", contrasena: "x" });
    expect(resultado.nombreUsuario).toBe("admin");
  });

  it("no recorta la contraseña", () => {
    const resultado = esquemaIngreso.parse({ nombreUsuario: "admin", contrasena: " con espacios " });
    expect(resultado.contrasena).toBe(" con espacios ");
  });

  it("rechaza usuario o contraseña vacíos con mensajes en español", () => {
    const resultado = esquemaIngreso.safeParse({ nombreUsuario: "   ", contrasena: "" });
    expect(resultado.success).toBe(false);
    const errores = resultado.error!.flatten().fieldErrors;
    expect(errores.nombreUsuario).toEqual(["Escribe tu nombre de usuario"]);
    expect(errores.contrasena).toEqual(["Escribe tu contraseña"]);
  });
});
