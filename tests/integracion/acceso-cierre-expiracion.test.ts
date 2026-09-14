// Historia 2 · Cerrar sesión y expiración (FR-006, FR-007, FR-009, SC-005).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { calcularHashToken } from "@/lib/token-sesion";
import { cerrarSesion, cerrarSesionesVencidas, iniciarSesion, validarSesion } from "@/servicios/acceso";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";

const HORA = 60 * 60 * 1000;

/** Retrocede el inicio de la sesión de un token, para simular el paso del tiempo. */
async function retrocederInicio(token: string, milisegundos: number) {
  const sesion = await prisma.sesion.findUniqueOrThrow({ where: { tokenHash: calcularHashToken(token) } });
  const inicio = new Date(Date.now() - milisegundos);
  await prisma.sesion.update({ where: { id: sesion.id }, data: { inicio } });
  return inicio;
}

async function ingresarComoPrueba(nombreUsuario = "jperez") {
  const { contrasena } = await crearUsuarioDePrueba({ nombreUsuario });
  return iniciarSesion(nombreUsuario, contrasena);
}

describe("cerrarSesion", () => {
  beforeEach(vaciarTablas);

  it("registra el fin con motivo USUARIO y la sesión deja de valer", async () => {
    const { token } = await ingresarComoPrueba();

    await cerrarSesion(token);

    const sesion = await prisma.sesion.findUniqueOrThrow({ where: { tokenHash: calcularHashToken(token) } });
    expect(sesion.fin).not.toBeNull();
    expect(sesion.motivoCierre).toBe("USUARIO");
    await expect(validarSesion(token)).resolves.toEqual({ estado: "inexistente" });
  });

  it("cerrar una de dos sesiones del mismo usuario no cierra la otra", async () => {
    const { contrasena } = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });
    const primera = await iniciarSesion("jperez", contrasena);
    const segunda = await iniciarSesion("jperez", contrasena);

    await cerrarSesion(primera.token);

    expect((await validarSesion(segunda.token)).estado).toBe("vigente");
  });
});

describe("expiración a las 8 horas desde el ingreso", () => {
  beforeEach(vaciarTablas);

  it("una sesión de hace 8 h y 1 min está expirada y queda cerrada con fin = inicio + 8 h", async () => {
    const { token } = await ingresarComoPrueba();
    const inicio = await retrocederInicio(token, 8 * HORA + 60 * 1000);

    // La cookie sigue presente (dura 24 h): el servidor detecta la expiración.
    await expect(validarSesion(token)).resolves.toEqual({ estado: "expirada" });

    const sesion = await prisma.sesion.findUniqueOrThrow({ where: { tokenHash: calcularHashToken(token) } });
    expect(sesion.motivoCierre).toBe("EXPIRADA");
    expect(sesion.fin!.getTime()).toBe(inicio.getTime() + 8 * HORA);
  });

  it("una sesión de hace 7 h 59 min sigue vigente", async () => {
    const { token } = await ingresarComoPrueba();
    await retrocederInicio(token, 8 * HORA - 60 * 1000);

    expect((await validarSesion(token)).estado).toBe("vigente");
  });

  it("cerrarSesionesVencidas cierra una sesión abandonada de hace 10 h y no toca una de hace 2 h", async () => {
    const { contrasena } = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });
    const abandonada = await iniciarSesion("jperez", contrasena);
    const reciente = await iniciarSesion("jperez", contrasena);
    const inicioAbandonada = await retrocederInicio(abandonada.token, 10 * HORA);
    await retrocederInicio(reciente.token, 2 * HORA);

    await cerrarSesionesVencidas();

    const cerrada = await prisma.sesion.findUniqueOrThrow({ where: { tokenHash: calcularHashToken(abandonada.token) } });
    expect(cerrada.motivoCierre).toBe("EXPIRADA");
    expect(cerrada.fin!.getTime()).toBe(inicioAbandonada.getTime() + 8 * HORA);

    const abierta = await prisma.sesion.findUniqueOrThrow({ where: { tokenHash: calcularHashToken(reciente.token) } });
    expect(abierta.fin).toBeNull();
  });

  it("cada ingreso cierra las sesiones vencidas de cualquier persona", async () => {
    const { token } = await ingresarComoPrueba("abandono");
    await retrocederInicio(token, 9 * HORA);

    await ingresarComoPrueba("otra");

    const sesion = await prisma.sesion.findUniqueOrThrow({ where: { tokenHash: calcularHashToken(token) } });
    expect(sesion.motivoCierre).toBe("EXPIRADA");
  });
});
