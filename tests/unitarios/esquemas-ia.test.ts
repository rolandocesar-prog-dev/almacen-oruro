// Esquemas del módulo de IA (F-007, contracts §4; FR-010, FR-012, FR-015).
import { describe, expect, it } from "vitest";
import {
  esquemaFiltroInformes,
  esquemaFiltroPronostico,
  esquemaNuevoInforme,
  esquemaSeccionesInforme,
} from "@/esquemas/ia";
import { erroresPorRuta } from "@/lib/errores";
import { mesAnteriorCompleto } from "@/lib/fechas";

describe("esquemaFiltroPronostico (FR-006)", () => {
  it("sin filtros deja la categoría sin elegir y la casilla desmarcada", () => {
    expect(esquemaFiltroPronostico.parse({})).toEqual({ categoria: undefined, soloConReposicion: false });
  });

  it("lee la categoría y la casilla marcada", () => {
    expect(esquemaFiltroPronostico.parse({ categoria: "4", soloConReposicion: "si" })).toEqual({
      categoria: 4,
      soloConReposicion: true,
    });
  });

  it("una categoría inválida en la dirección no rompe la página: se trata como «todas»", () => {
    expect(esquemaFiltroPronostico.parse({ categoria: "no-es-un-id" }).categoria).toBeUndefined();
  });
});

describe("esquemaFiltroInformes (FR-016)", () => {
  it("por defecto muestra todos los tipos", () => {
    expect(esquemaFiltroInformes.parse({}).tipo).toBe("todos");
  });

  it("acepta los dos tipos y descarta cualquier otro valor", () => {
    expect(esquemaFiltroInformes.parse({ tipo: "COMPRAS" }).tipo).toBe("COMPRAS");
    expect(esquemaFiltroInformes.parse({ tipo: "inventado" }).tipo).toBe("todos");
  });
});

describe("esquemaNuevoInforme (FR-010)", () => {
  it("propone el mes anterior completo cuando no se elige período", () => {
    const { desde, hasta } = mesAnteriorCompleto();
    expect(esquemaNuevoInforme.parse({ tipo: "COMPRAS" })).toEqual({ tipo: "COMPRAS", desde, hasta });
  });

  it("exige elegir el tipo de informe", () => {
    const resultado = esquemaNuevoInforme.safeParse({ desde: "2026-08-01", hasta: "2026-08-31" });
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(erroresPorRuta(resultado.error).tipo).toEqual(["Elige el tipo de informe"]);
  });

  it("rechaza un rango invertido y marca «hasta»", () => {
    const resultado = esquemaNuevoInforme.safeParse({
      tipo: "DISTRIBUCIONES",
      desde: "2026-08-31",
      hasta: "2026-08-01",
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(erroresPorRuta(resultado.error).hasta).toEqual(["La fecha «desde» no puede ser posterior a «hasta»"]);
    }
  });
});

describe("esquemaSeccionesInforme (FR-012, FR-015)", () => {
  const completo = {
    resumen: "En agosto se gastaron Bs 12.500 en 8 compras.",
    hallazgos: ["El gasto subió 12 % respecto de julio."],
    alertas: ["Hay 3 productos bajo el stock mínimo."],
    recomendaciones: ["Reponer detergente antes de fin de mes."],
  };

  it("acepta una respuesta completa", () => {
    expect(esquemaSeccionesInforme.parse(completo)).toEqual(completo);
  });

  it("acepta los tres arreglos vacíos: antes vacío que una alerta inventada (FR-012)", () => {
    const sinNadaQueDecir = { resumen: "Sin movimiento en el período.", hallazgos: [], alertas: [], recomendaciones: [] };
    expect(esquemaSeccionesInforme.parse(sinNadaQueDecir)).toEqual(sinNadaQueDecir);
  });

  it("rechaza una respuesta a la que le falta una sección", () => {
    const incompleta: Record<string, unknown> = { ...completo };
    delete incompleta.alertas;
    expect(esquemaSeccionesInforme.safeParse(incompleta).success).toBe(false);
  });

  it("rechaza un resumen vacío", () => {
    expect(esquemaSeccionesInforme.safeParse({ ...completo, resumen: "   " }).success).toBe(false);
  });
});
