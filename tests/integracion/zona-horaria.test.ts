// Regresión: los momentos que guarda Prisma deben coincidir con now() de PostgreSQL.
// Sin la opción TimeZone=UTC de src/lib/prisma.ts, con el servidor en America/La_Paz quedaban
// 4 horas corridos y los cálculos de fechas en SQL (expiración, reportes) fallaban.
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";

describe("zona horaria de la conexión", () => {
  beforeEach(vaciarTablas);

  it("un momento guardado desde JavaScript coincide con now() de la base", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const sesion = await prisma.sesion.create({
      data: { usuarioId: usuario.id, tokenHash: "c".repeat(64), inicio: new Date() },
    });

    const [fila] = await prisma.$queryRaw<{ segundos: number }[]>`
      SELECT abs(extract(epoch FROM now() - inicio))::float AS segundos FROM sesion WHERE id = ${sesion.id}`;

    expect(fila!.segundos).toBeLessThan(60);
  });
});
