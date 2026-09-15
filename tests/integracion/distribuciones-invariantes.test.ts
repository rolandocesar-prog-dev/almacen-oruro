// Invariantes de F-005 (SC-005, SC-006, RN-41, FR-012, D-16): tras una secuencia de registros y anulaciones,
// el stock cuadra con el kardex, lo entregado cuadra con las distribuciones vigentes y el estado de cada
// pedido sale de sus cantidades. Además, leyendo el código: distribuciones no se editan ni se borran y el
// stock no se escribe fuera de registrarMovimiento.
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { registrarCompra } from "@/servicios/compras";
import * as distribuciones from "@/servicios/distribuciones";
import { anularDistribucion, registrarDistribucion } from "@/servicios/distribuciones";
import { verificarConsistenciaInventario } from "@/servicios/inventario";
import { calcularEstadoPedido, registrarPedido } from "@/servicios/pedidos";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba, crearProveedorDePrueba, crearRepresentanteDePrueba } from "../ayudantes/catalogos";

const distribucionesTs = path.join(import.meta.dirname, "../../src/servicios/distribuciones.ts");

describe("invariantes tras registros y anulaciones", () => {
  beforeEach(vaciarTablas);

  it("stock = kardex (SC-006), entregado = suma de distribuciones vigentes (SC-005) y estado calculado (RN-41)", async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const proveedor = await crearProveedorDePrueba();
    const representante = await crearRepresentanteDePrueba();
    const a = await crearProductoDePrueba();
    const b = await crearProductoDePrueba();
    const c = await crearProductoDePrueba();

    // 2 compras
    await registrarCompra(
      { proveedorId: proveedor.id, nroFactura: "1", fecha: "2026-09-01", lineas: [{ productoId: a.id, cantidad: 20, precioUnitario: "5" }, { productoId: b.id, cantidad: 10, precioUnitario: "5" }] },
      usuario.id,
    );
    await registrarCompra({ proveedorId: proveedor.id, nroFactura: "2", fecha: "2026-09-02", lineas: [{ productoId: c.id, cantidad: 8, precioUnitario: "5" }] }, usuario.id);

    // 3 pedidos
    const pedido = async (lineas: [number, number][]) => {
      const { id } = await registrarPedido(
        { representanteId: representante.id, fecha: "2026-09-02", observacion: undefined, lineas: lineas.map(([productoId, cantidadSolicitada]) => ({ productoId, cantidadSolicitada })) },
        usuario.id,
      );
      return prisma.pedido.findUniqueOrThrow({ where: { id }, include: { lineas: { orderBy: { id: "asc" } } } });
    };
    const p1 = await pedido([[a.id, 10], [b.id, 5]]);
    const p2 = await pedido([[a.id, 8], [c.id, 6]]);
    const p3 = await pedido([[b.id, 4]]);
    const entregar = (p: typeof p1, cantidades: (number | undefined)[], nroVale: string) =>
      registrarDistribucion(
        { pedidoId: p.id, nroVale, fecha: "2026-09-05", observacion: undefined, lineas: p.lineas.map((linea, i) => ({ pedidoDetalleId: linea.id, cantidad: cantidades[i] })) },
        usuario.id,
      );

    // 5 distribuciones (parciales y completas) y 2 anulaciones
    const d1 = await entregar(p1, [6, 5], "10");
    await entregar(p1, [4, undefined], "11");
    const d3 = await entregar(p2, [8, 3], "12");
    await entregar(p3, [4], "13");
    await anularDistribucion(d1.id, "Cantidades mal cargadas", usuario.id);
    await entregar(p2, [undefined, 3], "14");
    await anularDistribucion(d3.id, "Vale equivocado", usuario.id);

    expect((await verificarConsistenciaInventario()).diferencias).toEqual([]);

    const lineas = await prisma.pedidoDetalle.findMany({
      include: { entregas: { select: { cantidad: true, distribucion: { select: { estado: true } } } } },
    });
    for (const linea of lineas) {
      const vigente = linea.entregas.filter((e) => e.distribucion.estado === "REGISTRADA").reduce((suma, e) => suma + e.cantidad, 0);
      expect(linea.cantidadEntregada, `línea ${linea.id}`).toBe(vigente);
    }

    const pedidos = await prisma.pedido.findMany({ include: { lineas: true } });
    for (const p of pedidos) if (p.estado !== "ANULADO") expect(p.estado, `pedido ${p.id}`).toBe(calcularEstadoPedido(p.lineas));
    expect(pedidos.map((p) => p.estado).sort()).toEqual(["ATENDIDO", "PARCIAL", "PARCIAL"]);
  });
});

describe("distribuciones inmutables y stock por el kardex (FR-012, D-16, principio III)", () => {
  const codigo = readFileSync(distribucionesTs, "utf8");

  it("el servicio no escribe stock ni borra distribuciones o movimientos", () => {
    expect((codigo.match(/data:\s*\{[^}]*\}/g) ?? []).some((bloque) => bloque.includes("stockActual"))).toBe(false);
    expect(codigo).not.toMatch(/producto\.(update|updateMany|upsert)\(/);
    expect(codigo).not.toMatch(/\$executeRaw/);
    expect(codigo).not.toMatch(/distribucion\.delete(Many)?\(/);
    expect(codigo).not.toMatch(/distribucionDetalle\.delete(Many)?\(/);
    expect(codigo).not.toMatch(/movimientoInventario\.(update|updateMany|delete|deleteMany)\(/);
  });

  it("el módulo no exporta funciones para editar ni borrar", () => {
    const nombres = Object.keys(distribuciones);
    expect(nombres).toEqual(expect.arrayContaining(["registrarDistribucion", "anularDistribucion"]));
    expect(nombres.filter((nombre) => /editar|modificar|borrar|eliminar|delete/i.test(nombre))).toEqual([]);
  });
});
