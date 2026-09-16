// Evaluación del catálogo sobre datos reales (F-007, Historia 3; FR-009, H3 · E7).
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { evaluarCatalogo, MOTIVO_NO_EVALUABLE } from "@/servicios/ia/evaluacion";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { productoConSerie } from "../ayudantes/consumo";

const AHORA = new Date("2026-09-15T12:00:00Z");
const ESTACIONAL = [2, 2, 4, 5, 7, 14, 16, 12, 6, 4, 3, 2];

let ids: { largo: number; corto: number };

describe("evaluarCatalogo (Historia 3)", () => {
  beforeAll(async () => {
    await vaciarTablas();
    const { usuario } = await crearUsuarioDePrueba();
    // 36 meses que terminan en agosto de 2026: evaluable.
    const consumos = Array.from({ length: 36 }, (_, i) => 10 + Math.floor(i / 6) + (ESTACIONAL[(i + 8) % 12] ?? 0));
    const largo = await productoConSerie(usuario.id, "2023-09", consumos);
    // 12 meses: no evaluable.
    const corto = await productoConSerie(usuario.id, "2025-09", Array.from({ length: 12 }, () => 5));
    ids = { largo: largo.id, corto: corto.id };
  }, 120_000);

  it("evalúa los productos con 30 meses o más y deja fuera del general a los demás (FR-009)", async () => {
    const { filas, general, mejorGeneral, evaluables } = await evaluarCatalogo(AHORA);

    expect(evaluables).toBe(1);
    const largo = filas.find((fila) => fila.productoId === ids.largo)!;
    const corto = filas.find((fila) => fila.productoId === ids.corto)!;
    expect(largo.evaluacion.evaluable).toBe(true);
    expect(corto.evaluacion).toEqual({ evaluable: false, motivo: MOTIVO_NO_EVALUABLE });

    // Con un solo producto evaluable, el general coincide con su fila.
    if (!largo.evaluacion.evaluable) throw new Error("debía ser evaluable");
    expect(largo.evaluacion.validacion.map((mes) => mes.mes)).toEqual(["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]);
    for (const resultado of general) {
      const fila = largo.evaluacion.porMetodo.find((r) => r.metodo === resultado.metodo)!;
      expect(resultado.maePromedio).toBeCloseTo(fila.mae, 10);
      expect(resultado.wapeGlobal).toBeCloseTo(fila.wape!, 10);
    }
    expect(general.map((r) => r.metodo)).toEqual(["holt-winters", "ingenuo-estacional", "promedio-movil"]);
    expect(mejorGeneral).not.toBeNull();
  });

  it("dos consultas seguidas dan exactamente lo mismo (H3 · E7)", async () => {
    expect(await evaluarCatalogo(AHORA)).toEqual(await evaluarCatalogo(AHORA));
  });

  it("un producto inactivo no se evalúa", async () => {
    await prisma.producto.update({ where: { id: ids.corto }, data: { activo: false } });
    const { filas } = await evaluarCatalogo(AHORA);
    expect(filas.some((fila) => fila.productoId === ids.corto)).toBe(false);
    await prisma.producto.update({ where: { id: ids.corto }, data: { activo: true } });
  });

  it("sin productos evaluables no hay resultado general", async () => {
    await vaciarTablas();
    const resultado = await evaluarCatalogo(AHORA);
    expect(resultado).toEqual({ filas: [], general: [], mejorGeneral: null, evaluables: 0 });
  });
});
