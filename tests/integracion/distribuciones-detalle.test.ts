// Historia 3 · Detalle de una distribución (FR-008, FR-011, X-08).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { obtenerDistribucion, registrarDistribucion } from "@/servicios/distribuciones";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearRepresentanteDePrueba, nombreDelCentro } from "../ayudantes/catalogos";
import { datosDistribucion, prepararPedidoConStock } from "../ayudantes/distribuciones";

describe("obtenerDistribucion", () => {
  beforeEach(vaciarTablas);

  it("trae vale, pedido, representante del pedido, líneas y quién la registró (E3)", async () => {
    const { usuario, representante, productos, pedido } = await prepararPedidoConStock({
      lineas: [
        { solicitada: 5, stock: 5, nombre: "Lavandina 1 L" },
        { solicitada: 3, stock: 3, nombre: "Jabón líquido" },
      ],
    });
    const { id } = await registrarDistribucion(datosDistribucion(pedido, [5, 2], { observacion: "Entregado en ventanilla" }), usuario.id);

    const detalle = await obtenerDistribucion(id);
    expect(detalle).toMatchObject({
      id,
      nroVale: "500",
      fecha: "2026-09-10",
      observacion: "Entregado en ventanilla",
      estado: "REGISTRADA",
      pedido: { id: pedido.id, fecha: "2026-09-01", estado: "PARCIAL" },
      representante: { id: representante.id, nombre: representante.nombre, apellido: representante.apellido, centroSalud: await nombreDelCentro(representante) },
      registradaPor: `${usuario.nombre} ${usuario.apellido}`,
      motivoAnulacion: null,
      anuladaPor: null,
      anuladaEn: null,
    });
    expect(detalle?.representante.centroSalud).toEqual(expect.any(String));
    expect(detalle?.lineas.map((l) => [l.productoId, l.nombre, l.cantidad])).toEqual([
      [productos[0]!.id, "Lavandina 1 L", 5],
      [productos[1]!.id, "Jabón líquido", 2],
    ]);
    expect(detalle?.lineas[0]?.unidad).toEqual(expect.any(String));
  });

  it("el representante se lee del pedido: si el pedido cambia de representante, el detalle lo refleja (X-08)", async () => {
    const { usuario, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 5, stock: 5 }] });
    const { id } = await registrarDistribucion(datosDistribucion(pedido, [1]), usuario.id);
    const otro = await crearRepresentanteDePrueba({ nombre: "Luis", apellido: "Choque" });

    await prisma.pedido.update({ where: { id: pedido.id }, data: { representanteId: otro.id } });

    expect((await obtenerDistribucion(id))?.representante).toMatchObject({ id: otro.id, apellido: "Choque" });
  });

  it("una distribución ANULADA trae motivo, quién la anuló y cuándo", async () => {
    const { usuario, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 5, stock: 5 }] });
    const { id } = await registrarDistribucion(datosDistribucion(pedido, [1]), usuario.id);
    const { usuario: anulador } = await crearUsuarioDePrueba({ nombre: "Rosa", apellido: "Mamani" });
    await prisma.distribucion.update({ where: { id }, data: { estado: "ANULADA", motivoAnulacion: "Vale equivocado", anuladaEn: new Date(), anuladaPorId: anulador.id } });

    const detalle = await obtenerDistribucion(id);
    expect(detalle).toMatchObject({ estado: "ANULADA", motivoAnulacion: "Vale equivocado", anuladaPor: "Rosa Mamani" });
    expect(detalle?.anuladaEn).toBeInstanceOf(Date);
  });

  it("devuelve null si no existe", async () => {
    expect(await obtenerDistribucion(999)).toBeNull();
  });
});
