// Serie de consumo mensual desde el kardex (F-007, FR-001, research A-01; RN-53).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { registrarCompra } from "@/servicios/compras";
import { anularDistribucion, registrarDistribucion } from "@/servicios/distribuciones";
import { registrarPedido } from "@/servicios/pedidos";
import { serieDeConsumo, seriesDeConsumo, valoresDe } from "@/servicios/ia/serie";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba, crearProveedorDePrueba, crearRepresentanteDePrueba } from "../ayudantes/catalogos";

/** "Ahora" fijo para que la serie no dependa del día en que se corra la prueba: 15/09/2026. */
const AHORA = new Date("2026-09-15T12:00:00Z");

let usuarioId: number;
let contador = 0;

/** Entrega `cantidad` unidades del producto con una distribución real, fechada en ese día. */
async function distribuir(productoId: number, cantidad: number, fecha: string) {
  const representante = await crearRepresentanteDePrueba();
  const { id: pedidoId } = await registrarPedido(
    { representanteId: representante.id, fecha, observacion: undefined, lineas: [{ productoId, cantidadSolicitada: cantidad }] },
    usuarioId,
  );
  const pedido = await prisma.pedido.findUniqueOrThrow({ where: { id: pedidoId }, include: { lineas: true } });
  contador += 1;
  const { id } = await registrarDistribucion(
    {
      pedidoId,
      nroVale: String(1000 + contador),
      fecha,
      observacion: undefined,
      lineas: [{ pedidoDetalleId: pedido.lineas[0]!.id, cantidad }],
    },
    usuarioId,
  );
  return id;
}

/** Producto con stock suficiente, cargado con una compra real (principio III). */
async function productoConStock(stock: number, fechaCompra = "2026-01-05") {
  const producto = await crearProductoDePrueba();
  const proveedor = await crearProveedorDePrueba();
  contador += 1;
  await registrarCompra(
    {
      proveedorId: proveedor.id,
      nroFactura: String(800000 + contador),
      fecha: fechaCompra,
      lineas: [{ productoId: producto.id, cantidad: stock, precioUnitario: "10" }],
    },
    usuarioId,
  );
  return producto;
}

describe("serieDeConsumo (FR-001)", () => {
  beforeEach(async () => {
    await vaciarTablas();
    usuarioId = (await crearUsuarioDePrueba()).usuario.id;
  });

  it("cuenta las unidades entregadas en cada mes y pone 0 en los meses sin movimientos", async () => {
    const producto = await productoConStock(50);
    await distribuir(producto.id, 6, "2026-02-10");
    await distribuir(producto.id, 4, "2026-04-20");

    expect(await serieDeConsumo(producto.id, AHORA)).toEqual([
      { mes: "2026-02", consumo: 6 },
      { mes: "2026-03", consumo: 0 },
      { mes: "2026-04", consumo: 4 },
      { mes: "2026-05", consumo: 0 },
      { mes: "2026-06", consumo: 0 },
      { mes: "2026-07", consumo: 0 },
      { mes: "2026-08", consumo: 0 },
    ]);
  });

  it("suma las entregas del mismo mes", async () => {
    const producto = await productoConStock(50);
    await distribuir(producto.id, 6, "2026-05-03");
    await distribuir(producto.id, 9, "2026-05-28");

    expect(valoresDe(await serieDeConsumo(producto.id, AHORA))).toEqual([15, 0, 0, 0]);
  });

  it("al anular la distribución, el mes vuelve a 0 porque la anulación lleva su fecha (RN-53)", async () => {
    const producto = await productoConStock(50);
    const distribucionId = await distribuir(producto.id, 6, "2026-06-10");
    expect(valoresDe(await serieDeConsumo(producto.id, AHORA))).toEqual([6, 0, 0]);

    // La anulación se registra hoy, pero su movimiento va fechado en junio: el mes queda en 0.
    await anularDistribucion(distribucionId, "Vale anulado por error de carga", usuarioId);

    expect(valoresDe(await serieDeConsumo(producto.id, AHORA))).toEqual([0, 0, 0]);
  });

  it("el mes en curso no forma parte de la serie: todavía está incompleto", async () => {
    const producto = await productoConStock(50);
    await distribuir(producto.id, 5, "2026-07-10");
    await distribuir(producto.id, 7, "2026-09-02");

    const serie = await serieDeConsumo(producto.id, AHORA);

    // Septiembre es el mes en curso: sus 7 unidades no entran, aunque estén en el kardex.
    expect(serie).toEqual([
      { mes: "2026-07", consumo: 5 },
      { mes: "2026-08", consumo: 0 },
    ]);
  });

  it("un producto sin movimientos devuelve una serie vacía", async () => {
    const producto = await crearProductoDePrueba();
    expect(await serieDeConsumo(producto.id, AHORA)).toEqual([]);
  });

  it("solo cuenta las salidas por distribución: una compra no es consumo", async () => {
    const producto = await productoConStock(30, "2026-03-05");
    expect(await serieDeConsumo(producto.id, AHORA)).toEqual([]);
  });
});

describe("seriesDeConsumo (research A-06)", () => {
  beforeEach(async () => {
    await vaciarTablas();
    usuarioId = (await crearUsuarioDePrueba()).usuario.id;
  });

  it("devuelve una entrada por producto pedido, igual a la que daría una por una", async () => {
    const uno = await productoConStock(50);
    const otro = await productoConStock(50);
    const sinMovimientos = await crearProductoDePrueba();
    await distribuir(uno.id, 6, "2026-07-10");
    await distribuir(otro.id, 3, "2026-08-12");

    const series = await seriesDeConsumo([uno.id, otro.id, sinMovimientos.id], AHORA);

    expect([...series.keys()].sort((a, b) => a - b)).toEqual([uno.id, otro.id, sinMovimientos.id].sort((a, b) => a - b));
    expect(series.get(uno.id)).toEqual(await serieDeConsumo(uno.id, AHORA));
    expect(series.get(otro.id)).toEqual(await serieDeConsumo(otro.id, AHORA));
    expect(series.get(sinMovimientos.id)).toEqual([]);
  });

  it("sin productos no consulta nada y devuelve un mapa vacío", async () => {
    expect(await seriesDeConsumo([], AHORA)).toEqual(new Map());
  });
});
