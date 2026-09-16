import { describe, expect, it } from "vitest";
import { esquemaReporteCompras, esquemaReporteDistribuciones, esquemaReporteExistencias, textoDeFiltros } from "@/esquemas/reportes";
import { hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";

describe("textoDeFiltros (FR-006)", () => {
  it("arma la línea de filtros aplicados uniendo con · ", () => {
    expect(
      textoDeFiltros([
        { etiqueta: "Del 01/09/2026 al 15/09/2026" },
        { etiqueta: "Proveedor", valor: "Distribuidora Andina" },
        { etiqueta: "Incluye anuladas" },
      ]),
    ).toBe("Del 01/09/2026 al 15/09/2026 · Proveedor: Distribuidora Andina · Incluye anuladas");
  });

  it("descarta las partes sin valor", () => {
    expect(
      textoDeFiltros([
        { etiqueta: "Del 01/09/2026 al 15/09/2026" },
        { etiqueta: "Proveedor", valor: undefined },
        { etiqueta: "Producto", valor: null },
      ]),
    ).toBe("Del 01/09/2026 al 15/09/2026");
  });

  it("sin filtros lo dice", () => {
    expect(textoDeFiltros([])).toBe("Sin filtros");
    expect(textoDeFiltros([{ etiqueta: "Categoría", valor: undefined }])).toBe("Sin filtros");
  });
});

describe("esquemaReporteCompras (FR-002, FR-003)", () => {
  it("por defecto toma el mes en curso, sin proveedor, sin anuladas y la página 1", () => {
    expect(esquemaReporteCompras.parse({})).toEqual({
      desde: inicioDelMesEnCurso(),
      hasta: hoyEnLaPaz(),
      proveedor: undefined,
      incluirAnulados: false,
      pagina: 1,
    });
  });

  it("la casilla solo cuenta si llega con «si»", () => {
    expect(esquemaReporteCompras.parse({ incluirAnulados: "si" }).incluirAnulados).toBe(true);
    expect(esquemaReporteCompras.parse({ incluirAnulados: "1" }).incluirAnulados).toBe(false);
  });

  it("un proveedor o una página inválidos toman el valor por defecto", () => {
    expect(esquemaReporteCompras.parse({ proveedor: "abc", pagina: "0" })).toMatchObject({ proveedor: undefined, pagina: 1 });
  });

  it("rechaza «desde» posterior a «hasta»", () => {
    const resultado = esquemaReporteCompras.safeParse({ desde: "2026-09-10", hasta: "2026-09-01" });
    expect(resultado.error?.issues[0]?.message).toBe("La fecha «desde» no puede ser posterior a «hasta»");
  });

  it("acepta un rango de fechas futuras (caso borde)", () => {
    expect(esquemaReporteCompras.parse({ desde: "2027-01-01", hasta: "2027-01-31" })).toMatchObject({ desde: "2027-01-01", hasta: "2027-01-31" });
  });
});

describe("esquemaReporteDistribuciones (FR-010)", () => {
  it("por defecto toma el mes en curso, sin representante ni producto y sin anuladas", () => {
    expect(esquemaReporteDistribuciones.parse({})).toEqual({
      desde: inicioDelMesEnCurso(),
      hasta: hoyEnLaPaz(),
      representante: undefined,
      producto: undefined,
      incluirAnulados: false,
      pagina: 1,
    });
  });

  it("ignora un representante o un producto inválidos", () => {
    expect(esquemaReporteDistribuciones.parse({ representante: "x", producto: "-1" })).toMatchObject({ representante: undefined, producto: undefined });
  });
});

describe("esquemaReporteExistencias (FR-011)", () => {
  it("no lleva rango de fechas: es la situación al emitirlo", () => {
    expect(esquemaReporteExistencias.parse({})).toEqual({ categoria: undefined, soloBajoMinimo: false });
  });

  it("acepta la categoría y la casilla de bajo mínimo", () => {
    expect(esquemaReporteExistencias.parse({ categoria: "3", soloBajoMinimo: "si" })).toEqual({ categoria: 3, soloBajoMinimo: true });
    expect(esquemaReporteExistencias.parse({ categoria: "abc" }).categoria).toBeUndefined();
  });
});
