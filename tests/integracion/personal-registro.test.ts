// Historia 3 · Registrar personal (FR-010 a FR-014).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ErrorDeNegocio } from "@/lib/errores";
import { iniciarSesion } from "@/servicios/acceso";
import { listarPersonal, obtenerPersonal, registrarPersonal } from "@/servicios/personal";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";

const datosJuan = {
  nombre: "Juan",
  apellido: "Pérez",
  cargo: "Auxiliar",
  nombreUsuario: "jperez",
  contrasena: "almacen2026",
  confirmacion: "almacen2026",
};

describe("registrarPersonal", () => {
  beforeEach(vaciarTablas);

  it("crea un usuario activo cuya contraseña se guarda solo como hash bcrypt", async () => {
    const { id } = await registrarPersonal(datosJuan);

    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id } });
    expect(usuario.activo).toBe(true);
    expect(usuario.debeCambiarContrasena).toBe(false);
    expect(usuario.contrasenaHash).toMatch(/^\$2[aby]\$/);
    expect(usuario.contrasenaHash).not.toContain("almacen2026");
  });

  it("la persona registrada puede ingresar con su usuario y contraseña", async () => {
    await registrarPersonal(datosJuan);
    await expect(iniciarSesion("jperez", "almacen2026")).resolves.toHaveProperty("token");
  });

  it("rechaza un nombre de usuario repetido, aunque sea de una persona inactiva", async () => {
    await crearUsuarioDePrueba({ nombreUsuario: "jperez", activo: false });

    const error = await registrarPersonal({ ...datosJuan, nombreUsuario: "jperez" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorDeNegocio);
    expect((error as ErrorDeNegocio).campo).toBe("nombreUsuario");
    expect((error as ErrorDeNegocio).message).toBe("Ya existe un usuario con el nombre de usuario 'jperez'");
    expect(await prisma.usuario.count()).toBe(1);
  });

  it("recorta los espacios internos repetidos de nombre, apellido y cargo", async () => {
    const { id } = await registrarPersonal({ ...datosJuan, nombre: "Juan   Carlos", cargo: "Auxiliar  de almacén" });
    const persona = await obtenerPersonal(id);
    expect(persona?.nombre).toBe("Juan Carlos");
    expect(persona?.cargo).toBe("Auxiliar de almacén");
  });
});

describe("consultas de personal", () => {
  beforeEach(vaciarTablas);

  it("obtenerPersonal y listarPersonal no devuelven el hash de la contraseña", async () => {
    const { id } = await registrarPersonal(datosJuan);

    const persona = await obtenerPersonal(id);
    const lista = await listarPersonal({ estado: "activos" });

    expect(persona).not.toBeNull();
    expect(persona).not.toHaveProperty("contrasenaHash");
    expect(lista[0]).not.toHaveProperty("contrasenaHash");
    expect(JSON.stringify(lista)).not.toContain("$2");
  });

  it("obtenerPersonal devuelve null si la persona no existe", async () => {
    await expect(obtenerPersonal(999)).resolves.toBeNull();
  });
});
