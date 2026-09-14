// Historia 4 · Modificar, desactivar y reactivar personal (FR-008, FR-012, FR-015 a FR-018).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ErrorDeNegocio } from "@/lib/errores";
import { iniciarSesion, validarSesion } from "@/servicios/acceso";
import * as servicioPersonal from "@/servicios/personal";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";

const { desactivarPersonal, listarPersonal, modificarPersonal, reactivarPersonal } = servicioPersonal;

const datosBase = { nombre: "Juan", apellido: "Pérez", cargo: "Auxiliar", nombreUsuario: "jperez" };

async function mensajeDeError(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return (error as ErrorDeNegocio).message;
}

describe("modificarPersonal", () => {
  beforeEach(vaciarTablas);

  it("guarda los cambios y permite ingresar con el nombre de usuario nuevo", async () => {
    const { usuario, contrasena } = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });

    await modificarPersonal(usuario.id, { ...datosBase, cargo: "Jefe de almacén", nombreUsuario: "juan.perez" });

    const guardado = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(guardado.cargo).toBe("Jefe de almacén");
    await expect(iniciarSesion("juan.perez", contrasena)).resolves.toHaveProperty("token");
  });

  it("rechaza un nombre de usuario de otra persona, pero no el propio", async () => {
    const { usuario } = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });
    await crearUsuarioDePrueba({ nombreUsuario: "mlopez" });

    expect(await mensajeDeError(modificarPersonal(usuario.id, { ...datosBase, nombreUsuario: "mlopez" }))).toBe(
      "Ya existe un usuario con el nombre de usuario 'mlopez'",
    );
    await expect(modificarPersonal(usuario.id, { ...datosBase, nombreUsuario: "jperez" })).resolves.toBeUndefined();
  });

  it("no cambia la contraseña, el estado ni la marca de cambio pendiente", async () => {
    const { usuario } = await crearUsuarioDePrueba({ nombreUsuario: "jperez", debeCambiarContrasena: true });

    await modificarPersonal(usuario.id, datosBase);

    const guardado = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(guardado.contrasenaHash).toBe(usuario.contrasenaHash);
    expect(guardado.activo).toBe(true);
    expect(guardado.debeCambiarContrasena).toBe(true);
  });

  it("indica si la persona no existe", async () => {
    expect(await mensajeDeError(modificarPersonal(999, datosBase))).toBe("No existe la persona indicada");
  });
});

describe("desactivar y reactivar", () => {
  beforeEach(vaciarTablas);

  it("desactivar cierra todas sus sesiones abiertas con motivo DESACTIVACION y no toca las de otros", async () => {
    const operador = await crearUsuarioDePrueba({ nombreUsuario: "admin" });
    const juan = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });
    const sesionOperador = await iniciarSesion("admin", operador.contrasena);
    const sesion1 = await iniciarSesion("jperez", juan.contrasena);
    const sesion2 = await iniciarSesion("jperez", juan.contrasena);

    await desactivarPersonal(juan.usuario.id, operador.usuario.id);

    const sesionesJuan = await prisma.sesion.findMany({ where: { usuarioId: juan.usuario.id } });
    expect(sesionesJuan.every((s) => s.fin !== null && s.motivoCierre === "DESACTIVACION")).toBe(true);
    expect((await validarSesion(sesion1.token)).estado).toBe("inexistente");
    expect((await validarSesion(sesion2.token)).estado).toBe("inexistente");
    expect((await validarSesion(sesionOperador.token)).estado).toBe("vigente");
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: juan.usuario.id } })).activo).toBe(false);
  });

  it("nadie puede desactivarse a sí mismo", async () => {
    const { usuario } = await crearUsuarioDePrueba({ nombreUsuario: "admin" });
    expect(await mensajeDeError(desactivarPersonal(usuario.id, usuario.id))).toBe("No puedes desactivar tu propio usuario");
  });

  it("una persona reactivada vuelve a ingresar con su contraseña anterior", async () => {
    const operador = await crearUsuarioDePrueba({ nombreUsuario: "admin" });
    const juan = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });

    await desactivarPersonal(juan.usuario.id, operador.usuario.id);
    await reactivarPersonal(juan.usuario.id);

    await expect(iniciarSesion("jperez", juan.contrasena)).resolves.toHaveProperty("token");
  });

  it("indica si ya estaba en el estado pedido", async () => {
    const operador = await crearUsuarioDePrueba({ nombreUsuario: "admin" });
    const juan = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });

    expect(await mensajeDeError(reactivarPersonal(juan.usuario.id))).toBe("La persona ya está activa");
    await desactivarPersonal(juan.usuario.id, operador.usuario.id);
    expect(await mensajeDeError(desactivarPersonal(juan.usuario.id, operador.usuario.id))).toBe("La persona ya está inactiva");
  });

  it("no existe ninguna función para borrar personal (D-15)", () => {
    const nombres = Object.keys(servicioPersonal);
    expect(nombres.some((nombre) => /borrar|eliminar|delete/i.test(nombre))).toBe(false);
  });
});

describe("listarPersonal con búsqueda y estado", () => {
  beforeEach(vaciarTablas);

  it("busca sin distinguir mayúsculas en nombre, apellido o usuario y filtra por estado", async () => {
    await crearUsuarioDePrueba({ nombreUsuario: "jperez", nombre: "Juan", apellido: "Pérez" });
    await crearUsuarioDePrueba({ nombreUsuario: "mlopez", nombre: "María", apellido: "López", activo: false });
    await crearUsuarioDePrueba({ nombreUsuario: "cquispe", nombre: "Carlos", apellido: "Quispe" });

    expect((await listarPersonal({ estado: "activos" })).map((p) => p.nombreUsuario)).toEqual(["jperez", "cquispe"]);
    expect((await listarPersonal({ estado: "inactivos" })).map((p) => p.nombreUsuario)).toEqual(["mlopez"]);
    expect(await listarPersonal({ estado: "todos" })).toHaveLength(3);
    expect((await listarPersonal({ estado: "todos", q: "LÓPEZ" })).map((p) => p.nombreUsuario)).toEqual(["mlopez"]);
    expect((await listarPersonal({ estado: "activos", q: "quis" })).map((p) => p.nombreUsuario)).toEqual(["cquispe"]);
  });
});
