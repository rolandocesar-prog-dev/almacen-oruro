// Generador de histórico simulado (F-007, Historia 1; SC-001, SC-004, FR-020 a FR-022).
//
// Se corre con una configuración **reducida** (3 productos, 6 meses): con 25 productos y 36 meses la
// prueba tardaría minutos y comprobaría exactamente lo mismo.
import { beforeEach, describe, expect, it } from "vitest";
import { ErrorDeNegocio } from "@/lib/errores";
import { textoDeFechaDocumento } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import { obtenerConfiguracion } from "@/servicios/configuracion";
import { verificarConsistenciaInventario } from "@/servicios/inventario";
import { generarHistorico } from "@/servicios/ia/generador";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";

const REDUCIDO = { meses: 6, productos: 3, semilla: 42 } as const;

/** "Hoy" fijo: el generador siempre termina en el mes anterior a este. */
const AHORA = new Date("2026-09-15T12:00:00Z");

/**
 * Los campos de **negocio** de toda la base, que son los que tienen que repetirse con la misma semilla.
 * Nunca se comparan ids ni `creadoEn`/`actualizadoEn`: cambian en cada ejecución y harían fallar la
 * prueba siempre, sin que nada esté mal.
 */
async function fotoDeNegocio() {
  const compras = await prisma.compra.findMany({
    orderBy: [{ nroFactura: "asc" }],
    select: {
      nroFactura: true,
      fecha: true,
      total: true,
      estado: true,
      motivoAnulacion: true,
      proveedor: { select: { razonSocial: true } },
      lineas: { orderBy: { id: "asc" }, select: { cantidad: true, precioUnitario: true, producto: { select: { codigo: true } } } },
    },
  });
  const pedidos = await prisma.pedido.findMany({
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
    select: {
      fecha: true,
      estado: true,
      motivoAnulacion: true,
      representante: { select: { ci: true } },
      lineas: {
        orderBy: { id: "asc" },
        select: { cantidadSolicitada: true, cantidadEntregada: true, producto: { select: { codigo: true } } },
      },
    },
  });
  const distribuciones = await prisma.distribucion.findMany({
    orderBy: [{ nroVale: "asc" }],
    select: {
      nroVale: true,
      fecha: true,
      estado: true,
      motivoAnulacion: true,
      lineas: {
        orderBy: { id: "asc" },
        select: { cantidad: true, pedidoDetalle: { select: { producto: { select: { codigo: true } } } } },
      },
    },
  });
  const productos = await prisma.producto.findMany({
    orderBy: { codigo: "asc" },
    select: { codigo: true, nombre: true, stockActual: true, stockMinimo: true },
  });
  const movimientos = await prisma.movimientoInventario.findMany({
    orderBy: [{ productoId: "asc" }, { id: "asc" }],
    select: { tipo: true, cantidad: true, saldoResultante: true, fechaDocumento: true, producto: { select: { codigo: true } } },
  });

  return {
    compras: compras.map((compra) => ({ ...compra, total: compra.total.toFixed(2) })),
    pedidos,
    distribuciones,
    productos,
    movimientos,
  };
}

async function generarReducido() {
  await crearUsuarioDePrueba();
  return generarHistorico({ ...REDUCIDO, ahora: AHORA });
}

describe("generarHistorico (Historia 1)", () => {
  beforeEach(vaciarTablas);

  it("con la misma semilla produce exactamente los mismos datos de negocio (SC-001)", async () => {
    await generarReducido();
    const primera = await fotoDeNegocio();

    await vaciarTablas();
    await generarReducido();
    const segunda = await fotoDeNegocio();

    expect(segunda).toEqual(primera);
  });

  it("deja el inventario consistente y sin stock negativo (SC-004, H1 · E4)", async () => {
    await generarReducido();

    const verificacion = await verificarConsistenciaInventario();
    expect(verificacion.diferencias).toEqual([]);
    const productos = await prisma.producto.findMany({ select: { stockActual: true } });
    for (const producto of productos) expect(producto.stockActual).toBeGreaterThanOrEqual(0);
  });

  it("genera los meses pedidos, terminando en el mes anterior al actual (FR-018)", async () => {
    await generarReducido();

    const movimientos = await prisma.movimientoInventario.findMany({ select: { fechaDocumento: true } });
    const meses = [...new Set(movimientos.map((movimiento) => textoDeFechaDocumento(movimiento.fechaDocumento).slice(0, 7)))].sort();

    expect(meses).toEqual(["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]);
  });

  it("crea catálogo, entregas parciales, pedidos en los cuatro estados y anulaciones (H1 · E5)", async () => {
    const resumen = await generarReducido();

    expect(await prisma.producto.count()).toBe(3);
    expect(await prisma.representante.count()).toBe(5);
    expect(await prisma.proveedor.count()).toBe(3);
    expect(await prisma.centroSalud.count()).toBe(1);

    const estados = await prisma.pedido.groupBy({ by: ["estado"], _count: true });
    expect(new Set(estados.map((fila) => fila.estado))).toEqual(new Set(["PENDIENTE", "PARCIAL", "ATENDIDO", "ANULADO"]));

    expect(resumen.comprasAnuladas).toBeGreaterThan(0);
    expect(resumen.distribucionesAnuladas).toBeGreaterThan(0);
    expect(await prisma.compra.count({ where: { estado: "ANULADA" } })).toBe(resumen.comprasAnuladas);
    expect(await prisma.distribucion.count({ where: { estado: "ANULADA" } })).toBe(resumen.distribucionesAnuladas);
  });

  it("todo movimiento nace de un documento: no hay stock escrito a mano (FR-020)", async () => {
    await generarReducido();

    const sueltos = await prisma.movimientoInventario.count({ where: { compraId: null, distribucionId: null } });
    expect(sueltos).toBe(0);
  });

  it("marca la base como de demostración, con fecha y semilla (FR-021, H1 · E6)", async () => {
    await generarReducido();

    const { modoDemostracion, datosSimuladosEn } = await obtenerConfiguracion();
    expect(modoDemostracion).toBe(true);
    expect(datosSimuladosEn).toBeInstanceOf(Date);
    const fila = await prisma.configuracion.findUniqueOrThrow({ where: { id: 1 } });
    expect(fila.semillaSimulacion).toBe(REDUCIDO.semilla);
  });

  it("sobre una base que ya tiene documentos se niega y no cambia nada (FR-022, H1 · E7)", async () => {
    await generarReducido();
    const antes = await fotoDeNegocio();

    const error = await generarHistorico({ ...REDUCIDO, ahora: AHORA }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorDeNegocio);
    expect((error as ErrorDeNegocio).message).toBe(
      "El generador solo se ejecuta sobre una base sin compras, pedidos ni distribuciones",
    );
    expect(await fotoDeNegocio()).toEqual(antes);
  });

  it("sin ningún usuario activo avisa que falta cargar la semilla", async () => {
    const error = await generarHistorico({ ...REDUCIDO, ahora: AHORA }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorDeNegocio);
    expect((error as ErrorDeNegocio).message).toMatch(/usuario activo/);
  });
});
