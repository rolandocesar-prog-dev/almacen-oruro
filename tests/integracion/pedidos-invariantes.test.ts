// FR-003, FR-008 y SC-003: los pedidos no escriben stock ni kardex, no se borran y su estado no se elige.
// Se verifica leyendo el código fuente, como la prueba de única escritura de F-003
// (tests/integracion/inventario-unica-escritura.test.ts, que sigue vigente).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as pedidos from "@/servicios/pedidos";

const pedidosTs = path.join(import.meta.dirname, "../../src/servicios/pedidos.ts");
const codigo = readFileSync(pedidosTs, "utf8");

describe("pedidos sin escrituras del stock (FR-003, SC-003)", () => {
  it("el servicio no escribe productos, movimientos ni SQL de escritura", () => {
    // Leer stockActual sí se permite: listarProductosParaPedido lo muestra como información (FR-005).
    expect(codigo).not.toMatch(/producto\.(update|updateMany|upsert)\(/);
    expect(codigo).not.toMatch(/movimientoInventario/);
    expect(codigo).not.toMatch(/registrarMovimiento/);
    expect(codigo).not.toMatch(/\$executeRaw/);
  });
});

describe("pedidos sin borrado ni estado elegido (FR-008)", () => {
  it("no borra pedidos", () => {
    expect(codigo).not.toMatch(/pedido\.delete(Many)?\(/);
  });

  it("no exporta funciones para borrar pedidos ni para elegir su estado", () => {
    const nombres = Object.keys(pedidos);
    expect(nombres).toEqual(expect.arrayContaining(["registrarPedido", "editarPedido", "anularPedido", "calcularEstadoPedido"]));
    expect(nombres.filter((nombre) => /borrar|eliminar|delete|cambiarEstado|elegirEstado/i.test(nombre))).toEqual([]);
  });
});
