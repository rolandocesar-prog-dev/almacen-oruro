// Situación de cada línea del pedido en el formulario de distribución (RN-36, FR-002; data-model §2).
import { describe, expect, it } from "vitest";
import { situacionDeLinea } from "@/servicios/distribuciones";

describe("situacionDeLinea", () => {
  it("completa si no queda nada pendiente, con cualquier stock", () => {
    expect(situacionDeLinea(0, 0)).toEqual({ situacion: "completa", maximoEntregable: 0 });
    expect(situacionDeLinea(0, 30)).toEqual({ situacion: "completa", maximoEntregable: 0 });
  });

  it("sin stock si hay pendiente pero el stock es 0", () => {
    expect(situacionDeLinea(5, 0)).toEqual({ situacion: "sin-stock", maximoEntregable: 0 });
  });

  it("el máximo entregable es el menor entre lo pendiente y el stock (RN-32)", () => {
    expect(situacionDeLinea(10, 6)).toEqual({ situacion: "entregable", maximoEntregable: 6 });
    expect(situacionDeLinea(5, 20)).toEqual({ situacion: "entregable", maximoEntregable: 5 });
    expect(situacionDeLinea(4, 4)).toEqual({ situacion: "entregable", maximoEntregable: 4 });
  });
});
