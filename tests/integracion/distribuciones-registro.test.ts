// Historia 1 · Registrar una distribución (FR-001 a FR-009, RN-30 a RN-34, SC-003, SC-004, SC-007).
import { beforeEach, describe, expect, it } from "vitest";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { buscarValeVigente, obtenerDistribucion, obtenerPedidoParaDistribuir, registrarDistribucion } from "@/servicios/distribuciones";
import { verificarConsistenciaInventario } from "@/servicios/inventario";
import { anularPedido } from "@/servicios/pedidos";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { datosDistribucion, prepararPedidoConStock } from "../ayudantes/distribuciones";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

async function stockDe(productoId: number) {
  return (await prisma.producto.findUniqueOrThrow({ where: { id: productoId } })).stockActual;
}

/** Todo lo que una distribución fallida no debe haber tocado. */
async function foto(pedidoId: number) {
  return {
    distribuciones: await prisma.distribucion.count(),
    lineas: await prisma.distribucionDetalle.count(),
    movimientos: await prisma.movimientoInventario.count(),
    stock: await prisma.producto.findMany({ select: { id: true, stockActual: true }, orderBy: { id: "asc" } }),
    pedido: await prisma.pedido.findUniqueOrThrow({ where: { id: pedidoId }, include: { lineas: { orderBy: { id: "asc" } } } }),
  };
}

async function consistente() {
  const verificacion = await verificarConsistenciaInventario();
  expect(verificacion.diferencias).toEqual([]);
}

describe("registrarDistribucion", () => {
  beforeEach(vaciarTablas);

  it("baja el stock con su kardex, sube lo entregado y el pedido pasa a PARCIAL (E2)", async () => {
    const { usuario, productos, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 10, stock: 6, nombre: "Lavandina 1 L" }] });

    const { id } = await registrarDistribucion(datosDistribucion(pedido, [6]), usuario.id);

    expect(await stockDe(productos[0]!.id)).toBe(0);
    const salida = await prisma.movimientoInventario.findFirstOrThrow({ where: { distribucionId: id } });
    expect(salida).toMatchObject({ tipo: "SALIDA_DISTRIBUCION", cantidad: -6, saldoResultante: 0, productoId: productos[0]!.id });
    expect(salida.fechaDocumento).toEqual(new Date("2026-09-10T00:00:00Z"));
    const guardada = await prisma.distribucion.findUniqueOrThrow({ where: { id }, include: { lineas: true } });
    expect(guardada).toMatchObject({ estado: "REGISTRADA", usuarioId: usuario.id, nroVale: "500", pedidoId: pedido.id });
    expect(guardada.lineas.map((l) => [l.pedidoDetalleId, l.cantidad])).toEqual([[pedido.lineas[0]!.id, 6]]);
    const actualizado = await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id }, include: { lineas: true } });
    expect(actualizado.estado).toBe("PARCIAL");
    expect(actualizado.lineas[0]!.cantidadEntregada).toBe(6);
    await consistente();
  });

  it("rechaza entregar más que el stock indicando máximo, pendiente y stock (E3)", async () => {
    const { usuario, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 10, stock: 6, nombre: "Lavandina 1 L" }] });
    const antes = await foto(pedido.id);

    const error = await errorDe(registrarDistribucion(datosDistribucion(pedido, [7]), usuario.id));
    expect(error.message).toBe("Lavandina 1 L: puedes entregar como máximo 6 (pendiente 10, stock 6)");
    expect(error.campo).toBe("lineas.0.cantidad");
    expect(await foto(pedido.id)).toEqual(antes);
  });

  it("rechaza entregar más que lo pendiente (E4)", async () => {
    const { usuario, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 5, stock: 20, nombre: "Jabón líquido" }] });

    const error = await errorDe(registrarDistribucion(datosDistribucion(pedido, [8]), usuario.id));
    expect(error.message).toBe("Jabón líquido: puedes entregar como máximo 5 (pendiente 5, stock 20)");
  });

  it("con una línea válida y otras que se exceden, informa las que fallan y no guarda nada (E9, SC-007)", async () => {
    const { usuario, pedido } = await prepararPedidoConStock({
      lineas: [
        { solicitada: 10, stock: 10, nombre: "Detergente" },
        { solicitada: 10, stock: 3, nombre: "Lavandina 1 L" },
        { solicitada: 2, stock: 9, nombre: "Trapeador" },
      ],
    });
    const antes = await foto(pedido.id);

    const error = await errorDe(registrarDistribucion(datosDistribucion(pedido, [5, 4, 3]), usuario.id));
    expect(error.message).toBe(
      "Lavandina 1 L: puedes entregar como máximo 3 (pendiente 10, stock 3); Trapeador: puedes entregar como máximo 2 (pendiente 2, stock 9)",
    );
    expect(error.campo).toBe("lineas.1.cantidad");
    expect(await foto(pedido.id)).toEqual(antes);
  });

  it("rechaza un vale vigente sin tocar stock ni pedido y acepta el mismo número con ceros a la izquierda (E5, SC-004)", async () => {
    const primero = await prepararPedidoConStock({ lineas: [{ solicitada: 5, stock: 5 }] });
    const { id } = await registrarDistribucion(datosDistribucion(primero.pedido, [2]), primero.usuario.id);
    const segundo = await prepararPedidoConStock({ lineas: [{ solicitada: 5, stock: 5 }] });
    const antes = await foto(segundo.pedido.id);

    const error = await errorDe(registrarDistribucion(datosDistribucion(segundo.pedido, [1]), segundo.usuario.id));
    expect(error.message).toBe("El vale 500 ya está registrado");
    expect(error.campo).toBe("nroVale");
    expect(error.enlace).toEqual({ texto: "Ver distribución", ruta: `/distribuciones/${id}` });
    expect(await foto(segundo.pedido.id)).toEqual(antes);

    await registrarDistribucion(datosDistribucion(segundo.pedido, [1], { nroVale: "0500" }), segundo.usuario.id);
    expect(await prisma.distribucion.count({ where: { estado: "REGISTRADA" } })).toBe(2);
  });

  it("buscarValeVigente ignora las distribuciones anuladas (RN-31)", async () => {
    const { usuario, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 5, stock: 5 }] });
    const { id } = await registrarDistribucion(datosDistribucion(pedido, [2]), usuario.id);
    expect(await buscarValeVigente("500")).toEqual({ id });

    await prisma.distribucion.update({ where: { id }, data: { estado: "ANULADA", motivoAnulacion: "Prueba", anuladaEn: new Date(), anuladaPorId: usuario.id } });
    expect(await buscarValeVigente("500")).toBeNull();
  });

  it("guarda solo las líneas con cantidad; las demás siguen pendientes (E6, RN-33)", async () => {
    const { usuario, productos, pedido } = await prepararPedidoConStock({
      lineas: [
        { solicitada: 4, stock: 10 },
        { solicitada: 3, stock: 10 },
        { solicitada: 2, stock: 10 },
      ],
    });

    const { id } = await registrarDistribucion(datosDistribucion(pedido, [4, "", 1]), usuario.id);

    expect(await prisma.distribucionDetalle.count({ where: { distribucionId: id } })).toBe(2);
    expect(await prisma.movimientoInventario.count({ where: { distribucionId: id } })).toBe(2);
    expect(await stockDe(productos[1]!.id)).toBe(10);
    const lineas = await prisma.pedidoDetalle.findMany({ where: { pedidoId: pedido.id }, orderBy: { id: "asc" } });
    expect(lineas.map((l) => l.cantidadEntregada)).toEqual([4, 0, 1]);
  });

  it("rechaza una fecha anterior a la del pedido indicando el rango (E8)", async () => {
    const { usuario, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 5, stock: 5 }], fechaPedido: "2026-09-01" });

    const error = await errorDe(registrarDistribucion(datosDistribucion(pedido, [1], { fecha: "2026-08-31" }), usuario.id));
    expect(error.message).toBe("La fecha de la distribución debe estar entre el 01/09/2026 y hoy");
    expect(error.campo).toBe("fecha");
  });

  it("rechaza pedidos ATENDIDOS, ANULADOS o inexistentes", async () => {
    const { usuario, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 2, stock: 10 }] });
    await registrarDistribucion(datosDistribucion(pedido, [2], { nroVale: "1" }), usuario.id);
    expect((await errorDe(registrarDistribucion(datosDistribucion(pedido, [1], { nroVale: "2" }), usuario.id))).message).toBe(
      "El pedido ya está atendido: no queda nada por entregar",
    );

    const otro = await prepararPedidoConStock({ lineas: [{ solicitada: 2, stock: 10 }] });
    await anularPedido(otro.pedido.id, "Ya no lo necesitan", otro.usuario.id);
    expect((await errorDe(registrarDistribucion(datosDistribucion(otro.pedido, [1], { nroVale: "3" }), usuario.id))).message).toBe(
      "El pedido está anulado: no se puede distribuir",
    );

    expect((await errorDe(registrarDistribucion({ ...datosDistribucion(pedido, [1], { nroVale: "4" }), pedidoId: 999_999 }, usuario.id))).message).toBe(
      "No existe el pedido indicado",
    );
  });

  it("rechaza una línea que pertenece a otro pedido", async () => {
    const uno = await prepararPedidoConStock({ lineas: [{ solicitada: 2, stock: 10 }] });
    const otro = await prepararPedidoConStock({ lineas: [{ solicitada: 2, stock: 10 }] });

    const datos = { ...datosDistribucion(uno.pedido, [1]), lineas: [{ pedidoDetalleId: otro.pedido.lineas[0]!.id, cantidad: 1 }] };
    const error = await errorDe(registrarDistribucion(datos, uno.usuario.id));
    expect(error.message).toBe("Línea 1: el producto no pertenece al pedido");
  });

  it("distribuye una línea cuyo producto se desactivó (caso borde, I-23)", async () => {
    const { usuario, productos, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 3, stock: 3, activo: false }] });

    await registrarDistribucion(datosDistribucion(pedido, [3]), usuario.id);

    expect(await stockDe(productos[0]!.id)).toBe(0);
    await consistente();
  });
});

describe("consultas del registro", () => {
  beforeEach(vaciarTablas);

  it("obtenerPedidoParaDistribuir trae el pedido con la situación de cada línea (E1, E10)", async () => {
    const { representante, productos, pedido } = await prepararPedidoConStock({
      lineas: [
        { solicitada: 10, stock: 6 },
        { solicitada: 2, stock: 0 },
      ],
    });

    const datos = await obtenerPedidoParaDistribuir(pedido.id);
    expect(datos).toMatchObject({
      id: pedido.id,
      fecha: "2026-09-01",
      estado: "PENDIENTE",
      representante: { id: representante.id, nombre: representante.nombre, apellido: representante.apellido, activo: true },
    });
    expect(datos?.representante.centroSalud).toEqual(expect.any(String));
    expect(datos?.lineas).toEqual([
      expect.objectContaining({
        pedidoDetalleId: pedido.lineas[0]!.id,
        productoId: productos[0]!.id,
        codigo: productos[0]!.codigo,
        nombre: productos[0]!.nombre,
        productoActivo: true,
        unidad: expect.any(String),
        solicitada: 10,
        entregada: 0,
        pendiente: 10,
        stockActual: 6,
        maximoEntregable: 6,
        situacion: "entregable",
      }),
      expect.objectContaining({ pendiente: 2, stockActual: 0, maximoEntregable: 0, situacion: "sin-stock" }),
    ]);
    expect(await obtenerPedidoParaDistribuir(999_999)).toBeNull();
  });

  it("obtenerDistribucion trae vale, pedido, representante del pedido y líneas", async () => {
    const { usuario, representante, productos, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 5, stock: 5 }] });
    const { id } = await registrarDistribucion(datosDistribucion(pedido, [4], { observacion: "Entregado en ventanilla" }), usuario.id);

    const detalle = await obtenerDistribucion(id);
    expect(detalle).toMatchObject({
      id,
      nroVale: "500",
      fecha: "2026-09-10",
      observacion: "Entregado en ventanilla",
      estado: "REGISTRADA",
      pedido: { id: pedido.id, fecha: "2026-09-01", estado: "PARCIAL" },
      representante: { id: representante.id, apellido: representante.apellido },
    });
    expect(detalle?.registradaEn).toBeInstanceOf(Date);
    expect(detalle?.lineas).toEqual([expect.objectContaining({ productoId: productos[0]!.id, codigo: productos[0]!.codigo, cantidad: 4, unidad: expect.any(String) })]);
    expect(await obtenerDistribucion(999_999)).toBeNull();
  });
});
