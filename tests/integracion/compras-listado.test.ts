// Historia 4 · Listar compras (FR-008).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { COMPRAS_POR_PAGINA, listarCompras, registrarCompra } from "@/servicios/compras";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba, crearProveedorDePrueba } from "../ayudantes/catalogos";

const filtroBase = { desde: "2026-01-01", hasta: "2026-12-31", estado: "todas" as const, pagina: 1 };

describe("listarCompras", () => {
  beforeEach(vaciarTablas);

  async function preparar() {
    const { usuario } = await crearUsuarioDePrueba();
    const andina = await crearProveedorDePrueba({ razonSocial: "Andina" });
    const quimica = await crearProveedorDePrueba({ razonSocial: "Química Oruro" });
    const producto = await crearProductoDePrueba();
    const otro = await crearProductoDePrueba();
    const registrar = (proveedorId: number, nroFactura: string, fecha: string, lineas = 1) =>
      registrarCompra(
        {
          proveedorId,
          nroFactura,
          fecha,
          lineas: [
            { productoId: producto.id, cantidad: 2, precioUnitario: "10" },
            ...(lineas > 1 ? [{ productoId: otro.id, cantidad: 1, precioUnitario: "5.50" }] : []),
          ],
        },
        usuario.id,
      );

    const c1 = await registrar(andina.id, "1234", "2026-09-01", 2);
    const c2 = await registrar(quimica.id, "5123", "2026-09-05");
    const c3 = await registrar(andina.id, "1299", "2026-08-20");
    await prisma.compra.update({
      where: { id: c2.id },
      data: { estado: "ANULADA", motivoAnulacion: "Prueba", anuladaEn: new Date(), anuladaPorId: usuario.id },
    });
    return { andina, quimica, c1, c2, c3 };
  }

  it("ordena por fecha descendente con ítems, total y estado", async () => {
    const { c1, c2, c3 } = await preparar();

    const { compras, total } = await listarCompras(filtroBase);
    expect(total).toBe(3);
    expect(compras.map((c) => c.id)).toEqual([c2.id, c1.id, c3.id]);
    expect(compras[1]).toMatchObject({ nroFactura: "1234", fecha: "2026-09-01", proveedor: "Andina", items: 2, total: "25.50", estado: "REGISTRADA" });
  });

  it("filtra por rango de fechas, proveedor, estado y factura que empieza con lo escrito", async () => {
    const { andina, c1, c2, c3 } = await preparar();

    expect((await listarCompras({ ...filtroBase, desde: "2026-09-01", hasta: "2026-09-30" })).compras.map((c) => c.id)).toEqual([c2.id, c1.id]);
    expect((await listarCompras({ ...filtroBase, proveedorId: andina.id })).compras.map((c) => c.id)).toEqual([c1.id, c3.id]);
    expect((await listarCompras({ ...filtroBase, estado: "anuladas" })).compras.map((c) => c.id)).toEqual([c2.id]);
    expect((await listarCompras({ ...filtroBase, estado: "registradas" })).total).toBe(2);
    // "12" encuentra 1234 y 1299, pero no 5123, que solo lo contiene en el medio.
    expect((await listarCompras({ ...filtroBase, factura: "12" })).compras.map((c) => c.nroFactura)).toEqual(["1234", "1299"]);
  });

  it(`pagina de ${COMPRAS_POR_PAGINA} en ${COMPRAS_POR_PAGINA}`, async () => {
    const { usuario } = await crearUsuarioDePrueba();
    const proveedor = await crearProveedorDePrueba();
    // Solo cabeceras: para probar la paginación no hacen falta líneas ni movimientos.
    await prisma.compra.createMany({
      data: Array.from({ length: COMPRAS_POR_PAGINA + 1 }, (_, i) => ({
        proveedorId: proveedor.id,
        nroFactura: String(i + 1),
        fecha: new Date("2026-09-01T00:00:00Z"),
        total: 10,
        usuarioId: usuario.id,
      })),
    });

    const primera = await listarCompras(filtroBase);
    expect(primera.compras).toHaveLength(COMPRAS_POR_PAGINA);
    expect(primera.total).toBe(COMPRAS_POR_PAGINA + 1);
    expect((await listarCompras({ ...filtroBase, pagina: 2 })).compras).toHaveLength(1);
  });
});
