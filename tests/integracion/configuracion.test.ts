// Marca de datos simulados (F-006, FR-007): la escribe F-007 y los reportes solo la leen.
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { obtenerConfiguracion } from "@/servicios/configuracion";
import { vaciarTablas } from "../ayudantes/base-de-datos";

describe("obtenerConfiguracion", () => {
  beforeEach(vaciarTablas);

  it("sin fila de configuración, la base no es de demostración", async () => {
    expect(await obtenerConfiguracion()).toEqual({ modoDemostracion: false, datosSimuladosEn: null });
  });

  it("con la marca encendida devuelve la fecha de los datos simulados", async () => {
    const momento = new Date("2026-09-15T12:00:00Z");
    await prisma.configuracion.create({ data: { id: 1, modoDemostracion: true, datosSimuladosEn: momento } });

    expect(await obtenerConfiguracion()).toEqual({ modoDemostracion: true, datosSimuladosEn: momento });
  });
});
