import { describe, expect, it } from "vitest";
import { textoDeFiltros } from "@/esquemas/reportes";

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
