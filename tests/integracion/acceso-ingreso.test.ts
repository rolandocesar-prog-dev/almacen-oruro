// Historia 1 · Ingresar al sistema (FR-001 a FR-005, aclaración 3).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ErrorDeNegocio } from "@/lib/errores";
import { calcularHashToken } from "@/lib/token-sesion";
import { iniciarSesion, validarSesion } from "@/servicios/acceso";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";

const MENSAJE_GENERICO = "Usuario o contraseña incorrectos";

async function esperarErrorGenerico(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  expect((error as ErrorDeNegocio).message).toBe(MENSAJE_GENERICO);
}

describe("iniciarSesion", () => {
  beforeEach(vaciarTablas);

  it("con credenciales correctas crea una sesión abierta y guarda solo el hash del token", async () => {
    const { usuario, contrasena } = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });

    const { token } = await iniciarSesion("jperez", contrasena);

    const sesiones = await prisma.sesion.findMany({ where: { usuarioId: usuario.id } });
    expect(sesiones).toHaveLength(1);
    expect(sesiones[0]!.inicio).toBeInstanceOf(Date);
    expect(sesiones[0]!.fin).toBeNull();
    expect(sesiones[0]!.tokenHash).toBe(calcularHashToken(token));
    expect(sesiones[0]!.tokenHash).not.toBe(token);
  });

  it("acepta el nombre de usuario con otras mayúsculas y espacios", async () => {
    const { contrasena } = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });
    await expect(iniciarSesion(" JPerez ", contrasena)).resolves.toHaveProperty("token");
  });

  it("da el mismo mensaje para contraseña incorrecta, usuario inexistente y usuario inactivo", async () => {
    const { contrasena } = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });
    await crearUsuarioDePrueba({ nombreUsuario: "inactivo", contrasena, activo: false });

    await esperarErrorGenerico(iniciarSesion("jperez", "incorrecta"));
    await esperarErrorGenerico(iniciarSesion("noexiste", contrasena));
    await esperarErrorGenerico(iniciarSesion("inactivo", contrasena));

    expect(await prisma.sesion.count()).toBe(0);
  });

  it("la contraseña distingue mayúsculas", async () => {
    await crearUsuarioDePrueba({ nombreUsuario: "jperez", contrasena: "Clave-Segura" });
    await esperarErrorGenerico(iniciarSesion("jperez", "clave-segura"));
  });
});

describe("validarSesion", () => {
  beforeEach(vaciarTablas);

  it("con un token válido devuelve el usuario sin datos sensibles", async () => {
    const { contrasena } = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });
    const { token } = await iniciarSesion("jperez", contrasena);

    const resultado = await validarSesion(token);

    expect(resultado.estado).toBe("vigente");
    if (resultado.estado !== "vigente") return;
    expect(resultado.sesion.usuario.nombreUsuario).toBe("jperez");
    expect(resultado.sesion.usuario).not.toHaveProperty("contrasenaHash");
    expect(resultado.sesion).not.toHaveProperty("tokenHash");
  });

  it("con un token desconocido indica que no hay sesión", async () => {
    await expect(validarSesion("token-que-no-existe")).resolves.toEqual({ estado: "inexistente" });
  });

  it("permite dos sesiones vigentes a la vez para la misma persona", async () => {
    const { contrasena } = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });
    const primera = await iniciarSesion("jperez", contrasena);
    const segunda = await iniciarSesion("jperez", contrasena);

    expect((await validarSesion(primera.token)).estado).toBe("vigente");
    expect((await validarSesion(segunda.token)).estado).toBe("vigente");
  });

  it("si el usuario fue desactivado, la sesión deja de valer y queda cerrada", async () => {
    const { usuario, contrasena } = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });
    const { token } = await iniciarSesion("jperez", contrasena);
    await prisma.usuario.update({ where: { id: usuario.id }, data: { activo: false } });

    await expect(validarSesion(token)).resolves.toEqual({ estado: "inexistente" });

    const sesion = await prisma.sesion.findFirstOrThrow({ where: { usuarioId: usuario.id } });
    expect(sesion.fin).not.toBeNull();
    expect(sesion.motivoCierre).toBe("DESACTIVACION");
  });
});
