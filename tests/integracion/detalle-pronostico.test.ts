// Datos del gráfico de consumo y pronóstico (F-007, Historia 7; FR-017).
import { beforeAll, describe, expect, it } from "vitest";
import { detalleDePronostico } from "@/servicios/ia/detalle";
import { evaluarProducto } from "@/servicios/ia/evaluacion";
import { pronosticarProducto } from "@/servicios/ia/pronostico";
import { serieDeConsumo } from "@/servicios/ia/serie";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { productoConSerie } from "../ayudantes/consumo";

const AHORA = new Date("2026-09-15T12:00:00Z");
let ids: { largo: number; corto: number };

describe("detalleDePronostico (Historia 7)", () => {
  beforeAll(async () => {
    await vaciarTablas();
    const { usuario } = await crearUsuarioDePrueba();
    const largo = await productoConSerie(usuario.id, "2024-03", Array.from({ length: 30 }, (_, i) => 10 + (i % 12 >= 5 && i % 12 <= 7 ? 8 : 0)), {
      stockFinal: 5,
      stockMinimo: 4,
    });
    const corto = await productoConSerie(usuario.id, "2026-06", [3, 4, 5]);
    ids = { largo: largo.id, corto: corto.id };
  }, 120_000);

  it("reúne la serie, el pronóstico del mes y los 6 meses de validación de un producto evaluable (H7 · E1, E2)", async () => {
    const detalle = await detalleDePronostico(ids.largo, AHORA);
    const serie = await serieDeConsumo(ids.largo, AHORA);
    const evaluacion = evaluarProducto(serie);
    if (!detalle || !evaluacion.evaluable) throw new Error("debía existir y ser evaluable");

    expect(detalle.serie).toEqual(serie);
    expect(detalle.mesPronosticado).toBe("2026-09");
    expect(detalle.pronostico).toBe(pronosticarProducto(serie).pronostico);
    expect(detalle.producto).toMatchObject({ stockActual: 5, stockMinimo: 4 });
    expect(detalle.validacion.map((mes) => mes.mes)).toEqual(serie.slice(-6).map((punto) => punto.mes));
    expect(detalle.validacion.map((mes) => mes.pronostico)).toEqual(evaluacion.porMetodo[0]?.pronosticos);
  });

  it("un producto con poca historia no tiene meses de validación", async () => {
    const detalle = await detalleDePronostico(ids.corto, AHORA);
    expect(detalle?.metodo).toBe("promedio-movil");
    expect(detalle?.validacion).toEqual([]);
  });

  it("un producto inexistente devuelve null", async () => {
    expect(await detalleDePronostico(999_999, AHORA)).toBeNull();
  });
});
