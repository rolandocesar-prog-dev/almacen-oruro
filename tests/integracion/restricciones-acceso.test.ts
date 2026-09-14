// Las restricciones de la base rechazan datos inválidos aunque se inserten saltándose los
// servicios (data-model.md §4). Es la segunda línea de defensa del principio II.
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";

const datosUsuario = {
  nombre: "Juan",
  apellido: "Pérez",
  cargo: "Auxiliar",
  contrasenaHash: "hash",
};

describe("restricciones de usuario, sesión y configuración", () => {
  beforeEach(vaciarTablas);

  it("rechaza nombre de usuario con mayúsculas o espacios (usuario_nombre_usuario_formato)", async () => {
    await expect(prisma.usuario.create({ data: { ...datosUsuario, nombreUsuario: "JPerez" } })).rejects.toThrow();
    await expect(prisma.usuario.create({ data: { ...datosUsuario, nombreUsuario: "juan perez" } })).rejects.toThrow();
  });

  it("rechaza teléfono con letras (usuario_telefono_formato)", async () => {
    await expect(
      prisma.usuario.create({ data: { ...datosUsuario, nombreUsuario: "jperez", telefono: "77abc" } }),
    ).rejects.toThrow();
  });

  it("rechaza dos usuarios con el mismo nombre de usuario (UNIQUE)", async () => {
    await prisma.usuario.create({ data: { ...datosUsuario, nombreUsuario: "jperez" } });
    await expect(prisma.usuario.create({ data: { ...datosUsuario, nombreUsuario: "jperez" } })).rejects.toThrow();
  });

  it("rechaza una sesión con fin pero sin motivo (sesion_cierre_coherente)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    await expect(
      prisma.sesion.create({ data: { usuarioId: usuario.id, tokenHash: "a".repeat(64), fin: new Date() } }),
    ).rejects.toThrow();
  });

  it("rechaza una sesión que termina antes de empezar (sesion_fin_posterior)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    await expect(
      prisma.sesion.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: "b".repeat(64),
          inicio: new Date("2026-09-13T12:00:00Z"),
          fin: new Date("2026-09-13T11:00:00Z"),
          motivoCierre: "USUARIO",
        },
      }),
    ).rejects.toThrow();
  });

  it("rechaza una segunda fila de configuración (configuracion_fila_unica)", async () => {
    await prisma.configuracion.create({ data: { id: 1 } });
    await expect(prisma.configuracion.create({ data: { id: 2 } })).rejects.toThrow();
  });
});
