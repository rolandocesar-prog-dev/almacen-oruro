// Estado calculado del pedido (RN-41, FR-008, SC-002): la tabla de estados de la especificación.
import { describe, expect, it } from "vitest";
import { calcularEstadoPedido } from "@/servicios/pedidos";

const linea = (cantidadSolicitada: number, cantidadEntregada: number) => ({ cantidadSolicitada, cantidadEntregada });

describe("calcularEstadoPedido", () => {
  it("PENDIENTE si ninguna línea tiene entregas", () => {
    expect(calcularEstadoPedido([linea(10, 0)])).toBe("PENDIENTE");
    expect(calcularEstadoPedido([linea(10, 0), linea(5, 0)])).toBe("PENDIENTE");
  });

  it("ATENDIDO si en todas las líneas lo entregado es igual a lo solicitado", () => {
    expect(calcularEstadoPedido([linea(10, 10)])).toBe("ATENDIDO");
    expect(calcularEstadoPedido([linea(10, 10), linea(5, 5), linea(1, 1)])).toBe("ATENDIDO");
  });

  it.each([
    ["10/6 y 5/5 (Historia 3 · E2)", [linea(10, 6), linea(5, 5)]],
    ["10/0 y 5/5", [linea(10, 0), linea(5, 5)]],
    ["10/6 y 5/0", [linea(10, 6), linea(5, 0)]],
    ["10/6", [linea(10, 6)]],
  ])("PARCIAL con %s", (_caso, lineas) => {
    expect(calcularEstadoPedido(lineas)).toBe("PARCIAL");
  });

  it("nunca devuelve ANULADO: ese estado solo lo pone la anulación (RN-43)", () => {
    const casos = [[linea(10, 0)], [linea(10, 10)], [linea(10, 3)], [linea(4, 4), linea(4, 0)]];
    for (const lineas of casos) expect(calcularEstadoPedido(lineas)).not.toBe("ANULADO");
  });
});
