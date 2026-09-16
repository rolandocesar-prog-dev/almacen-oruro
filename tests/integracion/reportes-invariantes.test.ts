// FR-005: generar o imprimir un reporte no modifica ningún dato. Se verifica de dos maneras: leyendo el
// código del servicio y contando las filas de las tablas antes y después de emitir los cinco reportes.
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { registrarDistribucion } from "@/servicios/distribuciones";
import * as reportes from "@/servicios/reportes";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { datosDistribucion, prepararPedidoConStock } from "../ayudantes/distribuciones";

const reportesTs = path.join(import.meta.dirname, "../../src/servicios/reportes.ts");
const codigo = readFileSync(reportesTs, "utf8");

async function conteos() {
  return {
    compras: await prisma.compra.count(),
    lineasDeCompra: await prisma.compraDetalle.count(),
    distribuciones: await prisma.distribucion.count(),
    lineasDeDistribucion: await prisma.distribucionDetalle.count(),
    pedidos: await prisma.pedido.count(),
    lineasDePedido: await prisma.pedidoDetalle.count(),
    movimientos: await prisma.movimientoInventario.count(),
    productos: await prisma.producto.findMany({ select: { id: true, stockActual: true }, orderBy: { id: "asc" } }),
  };
}

describe("los reportes no escriben (FR-005)", () => {
  beforeEach(vaciarTablas);

  it("el servicio no llama a ninguna operación de escritura", () => {
    expect(codigo).not.toMatch(/\.create\(|\.createMany\(|\.update\(|\.updateMany\(|\.upsert\(|\.delete\(|\.deleteMany\(/);
    expect(codigo).not.toMatch(/\$executeRaw|\$transaction/);
    // La palabra aparece en el comentario de cabecera; lo que no debe existir es una llamada.
    expect(codigo).not.toMatch(/registrarMovimiento\(/);
    // De inventario solo se importan las dos consultas de lectura (research E-01).
    expect(codigo).toMatch(/import \{ listarExistencias, obtenerKardex \} from "\.\/inventario";/);
  });

  it("solo exporta reportes y el tamaño de página", () => {
    const exportaciones = Object.keys(reportes);
    expect(exportaciones).toEqual(
      expect.arrayContaining(["reporteCompras", "reporteDistribuciones", "reporteExistencias", "reporteKardex", "reportePedidos"]),
    );
    expect(exportaciones.filter((nombre) => !nombre.startsWith("reporte") && nombre !== "FILAS_POR_PAGINA_REPORTE")).toEqual([]);
  });

  it("generar los cinco reportes deja la base igual", async () => {
    const { usuario, pedido, productos } = await prepararPedidoConStock({ lineas: [{ solicitada: 10, stock: 10 }] });
    await registrarDistribucion(datosDistribucion(pedido, [4]), usuario.id);
    const antes = await conteos();
    const rango = { desde: "2026-09-01", hasta: "2026-09-30" };

    await reportes.reporteCompras({ ...rango, incluirAnulados: true });
    await reportes.reporteDistribuciones({ ...rango, incluirAnulados: true });
    await reportes.reporteExistencias({ soloBajoMinimo: false });
    await reportes.reporteKardex(productos[0]!.id, rango);
    await reportes.reportePedidos({ ...rango, estado: "todos", incluirAnulados: true });

    expect(await conteos()).toEqual(antes);
  });
});
