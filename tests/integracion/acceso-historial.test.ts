// Historia 6 · Consultar el historial de sesiones (FR-022; Historia 2, escenario 3).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { listarSesiones } from "@/servicios/acceso";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";

let contadorToken = 0;

/** Inserta una sesión con los datos indicados. */
async function crearSesion(usuarioId: number, datos: { inicio: Date; fin?: Date; motivoCierre?: "USUARIO" | "EXPIRADA" | "DESACTIVACION" | "RESTABLECIMIENTO" }) {
  contadorToken += 1;
  return prisma.sesion.create({ data: { usuarioId, tokenHash: String(contadorToken).padStart(64, "0"), ...datos } });
}

const HORA = 60 * 60 * 1000;

describe("listarSesiones", () => {
  beforeEach(vaciarTablas);

  it("ordena de la más reciente a la más antigua y traduce cómo terminó cada una", async () => {
    const { usuario } = await crearUsuarioDePrueba({ nombreUsuario: "jperez", nombre: "Juan", apellido: "Pérez" });
    const ahora = Date.now();
    await crearSesion(usuario.id, { inicio: new Date(ahora - 5 * HORA), fin: new Date(ahora - 4 * HORA), motivoCierre: "USUARIO" });
    await crearSesion(usuario.id, { inicio: new Date(ahora - 3 * HORA), fin: new Date(ahora - 2 * HORA), motivoCierre: "RESTABLECIMIENTO" });
    await crearSesion(usuario.id, { inicio: new Date(ahora - HORA) });

    const { filas, total } = await listarSesiones({ desde: "2020-01-01", hasta: "2099-12-31", pagina: 1 });

    expect(total).toBe(3);
    expect(filas.map((f) => f.estado)).toEqual(["Abierta", "Cerrada por desactivación o restablecimiento", "Cerrada por el usuario"]);
    expect(filas[0]!.persona).toBe("Juan Pérez");
    expect(filas[0]!.nombreUsuario).toBe("jperez");
  });

  it("cierra antes de listar las sesiones abandonadas, con fin = inicio + 8 h", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const inicio = new Date(Date.now() - 12 * HORA);
    await crearSesion(usuario.id, { inicio });

    const { filas } = await listarSesiones({ desde: "2020-01-01", hasta: "2099-12-31", pagina: 1 });

    expect(filas[0]!.estado).toBe("Expirada");
    expect(filas[0]!.fin!.getTime()).toBe(inicio.getTime() + 8 * HORA);
  });

  it("filtra por persona y por rango de fechas de inicio en hora de La Paz", async () => {
    const juan = await crearUsuarioDePrueba({ nombreUsuario: "jperez" });
    const maria = await crearUsuarioDePrueba({ nombreUsuario: "mlopez" });
    // 23:00 del 10/09 en La Paz = 03:00 UTC del 11/09: pertenece al día 10.
    await crearSesion(juan.usuario.id, { inicio: new Date("2026-09-11T03:00:00Z"), fin: new Date("2026-09-11T04:00:00Z"), motivoCierre: "USUARIO" });
    // 00:30 del 11/09 en La Paz: fuera de un rango que termina el 10.
    await crearSesion(juan.usuario.id, { inicio: new Date("2026-09-11T04:30:00Z"), fin: new Date("2026-09-11T05:00:00Z"), motivoCierre: "USUARIO" });
    await crearSesion(maria.usuario.id, { inicio: new Date("2026-09-10T15:00:00Z"), fin: new Date("2026-09-10T16:00:00Z"), motivoCierre: "USUARIO" });

    const deJuan = await listarSesiones({ usuarioId: juan.usuario.id, desde: "2026-09-01", hasta: "2026-09-10", pagina: 1 });
    expect(deJuan.total).toBe(1);
    expect(deJuan.filas[0]!.inicio.toISOString()).toBe("2026-09-11T03:00:00.000Z");

    const todos = await listarSesiones({ desde: "2026-09-10", hasta: "2026-09-10", pagina: 1 });
    expect(todos.total).toBe(2);
  });

  it("pagina de 50 en 50", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const base = new Date("2026-09-05T12:00:00Z").getTime();
    for (let i = 0; i < 55; i++) {
      await crearSesion(usuario.id, { inicio: new Date(base + i * 60 * 1000), fin: new Date(base + i * 60 * 1000 + 1000), motivoCierre: "USUARIO" });
    }

    const pagina1 = await listarSesiones({ desde: "2026-09-01", hasta: "2026-09-30", pagina: 1 });
    const pagina2 = await listarSesiones({ desde: "2026-09-01", hasta: "2026-09-30", pagina: 2 });

    expect(pagina1.total).toBe(55);
    expect(pagina1.filas).toHaveLength(50);
    expect(pagina2.filas).toHaveLength(5);
  });
});
