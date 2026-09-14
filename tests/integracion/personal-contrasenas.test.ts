// Historia 5 · Cambiar la propia contraseña y restablecer la de otro (FR-008, FR-019 a FR-021).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ErrorDeNegocio } from "@/lib/errores";
import { iniciarSesion, validarSesion } from "@/servicios/acceso";
import { cambiarContrasenaPropia, restablecerContrasena } from "@/servicios/personal";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

describe("cambiarContrasenaPropia", () => {
  beforeEach(vaciarTablas);

  it("con la actual correcta cambia la contraseña, quita el cambio pendiente y mantiene la sesión", async () => {
    const { usuario, contrasena } = await crearUsuarioDePrueba({ nombreUsuario: "jperez", debeCambiarContrasena: true });
    const { token } = await iniciarSesion("jperez", contrasena);

    await cambiarContrasenaPropia(usuario.id, contrasena, "nueva-segura");

    const guardado = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(guardado.debeCambiarContrasena).toBe(false);
    expect((await validarSesion(token)).estado).toBe("vigente");
    await expect(iniciarSesion("jperez", "nueva-segura")).resolves.toHaveProperty("token");
    await expect(iniciarSesion("jperez", contrasena)).rejects.toThrow("Usuario o contraseña incorrectos");
  });

  it("con la actual incorrecta no cambia nada", async () => {
    const { usuario, contrasena } = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });

    const error = await errorDe(cambiarContrasenaPropia(usuario.id, "incorrecta", "nueva-segura"));

    expect(error.message).toBe("La contraseña actual no es correcta");
    expect(error.campo).toBe("contrasenaActual");
    await expect(iniciarSesion("jperez", contrasena)).resolves.toHaveProperty("token");
  });

  it("rechaza una contraseña nueva igual a la actual", async () => {
    const { usuario, contrasena } = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });
    const error = await errorDe(cambiarContrasenaPropia(usuario.id, contrasena, contrasena));
    expect(error.message).toBe("La contraseña nueva debe ser distinta de la actual");
  });
});

describe("restablecerContrasena", () => {
  beforeEach(vaciarTablas);

  it("asigna la temporal, marca el cambio pendiente y cierra sus sesiones con motivo RESTABLECIMIENTO", async () => {
    const operador = await crearUsuarioDePrueba({ nombreUsuario: "admin" });
    const juan = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });
    const sesionJuan = await iniciarSesion("jperez", juan.contrasena);
    const sesionOperador = await iniciarSesion("admin", operador.contrasena);

    await restablecerContrasena(juan.usuario.id, "temporal123", operador.usuario.id);

    const guardado = await prisma.usuario.findUniqueOrThrow({ where: { id: juan.usuario.id } });
    expect(guardado.debeCambiarContrasena).toBe(true);
    const sesion = await prisma.sesion.findFirstOrThrow({ where: { usuarioId: juan.usuario.id } });
    expect(sesion.motivoCierre).toBe("RESTABLECIMIENTO");
    expect((await validarSesion(sesionJuan.token)).estado).toBe("inexistente");
    expect((await validarSesion(sesionOperador.token)).estado).toBe("vigente");

    await expect(iniciarSesion("jperez", juan.contrasena)).rejects.toThrow("Usuario o contraseña incorrectos");
    const { token } = await iniciarSesion("jperez", "temporal123");
    const validacion = await validarSesion(token);
    expect(validacion.estado === "vigente" && validacion.sesion.usuario.debeCambiarContrasena).toBe(true);
  });

  it("nadie restablece su propia contraseña", async () => {
    const { usuario } = await crearUsuarioDePrueba({ nombreUsuario: "admin" });
    const error = await errorDe(restablecerContrasena(usuario.id, "temporal123", usuario.id));
    expect(error.message).toBe("Para cambiar tu propia contraseña usa 'Cambiar mi contraseña'");
  });
});
