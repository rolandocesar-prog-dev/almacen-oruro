// Informe IA de compras con un redactor falso (F-007, Historia 4; FR-011, FR-012, FR-014, FR-015).
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { anularCompra, registrarCompra } from "@/servicios/compras";
import { datosInformeCompras, generarInforme, MENSAJES_INFORME } from "@/servicios/ia/informes";
import type { MotivoDeFalla } from "@/servicios/ia/redactor";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearProductoDePrueba, crearProveedorDePrueba } from "../ayudantes/catalogos";
import { CLAVES_PROHIBIDAS, clavesEnProfundidad, redactorQueFalla, redactorQueResponde } from "../ayudantes/redactor-falso";

const AGOSTO = { desde: "2026-08-01", hasta: "2026-08-31" };
let usuarioId: number;

async function mensajeDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return (error as ErrorDeNegocio).message;
}

describe("Informe IA de compras (Historia 4)", () => {
  beforeAll(async () => {
    await vaciarTablas();
    usuarioId = (await crearUsuarioDePrueba()).usuario.id;
    const andina = await crearProveedorDePrueba({ razonSocial: "Comercial Andina Ltda." });
    const paz = await crearProveedorDePrueba({ razonSocial: "Distribuidora La Paz" });
    const detergente = await crearProductoDePrueba({ nombre: "Detergente 1 kg", codigo: "LIM-001", stockMinimo: 0 });
    const escoba = await crearProductoDePrueba({ nombre: "Escoba", codigo: "UTE-002", stockMinimo: 10 });

    // Julio: 65,00 en una compra.
    await registrarCompra(
      { proveedorId: andina.id, nroFactura: "100", fecha: "2026-07-15", observacion: undefined, lineas: [{ productoId: escoba.id, cantidad: 1, precioUnitario: "65.00" }] },
      usuarioId,
    );
    // Agosto: 110,00 + 20,00 vigentes; una compra de 100,00 anulada que no cuenta.
    await registrarCompra(
      {
        proveedorId: andina.id,
        nroFactura: "101",
        fecha: "2026-08-05",
        observacion: undefined,
        lineas: [
          { productoId: detergente.id, cantidad: 10, precioUnitario: "5.00" },
          { productoId: escoba.id, cantidad: 2, precioUnitario: "30.00" },
        ],
      },
      usuarioId,
    );
    await registrarCompra(
      { proveedorId: paz.id, nroFactura: "200", fecha: "2026-08-20", observacion: undefined, lineas: [{ productoId: detergente.id, cantidad: 4, precioUnitario: "5.00" }] },
      usuarioId,
    );
    const anulada = await registrarCompra(
      { proveedorId: paz.id, nroFactura: "201", fecha: "2026-08-25", observacion: undefined, lineas: [{ productoId: detergente.id, cantidad: 1, precioUnitario: "100.00" }] },
      usuarioId,
    );
    await anularCompra(anulada.id, "Factura cargada dos veces", usuarioId);
  });

  beforeEach(async () => {
    await prisma.informeIa.deleteMany();
  });

  it("calcula los datos del período con la comparación contra el anterior (FR-011, H4 · E1)", async () => {
    const datos = await datosInformeCompras(AGOSTO);

    expect(datos).toEqual({
      periodo: { desde: "2026-08-01", hasta: "2026-08-31", anteriorDesde: "2026-07-01", anteriorHasta: "2026-07-31" },
      totales: {
        totalGastado: "130.00",
        compras: 2,
        totalGastadoAnterior: "65.00",
        comprasAnterior: 1,
        variacionGastoPorcentual: 100,
        variacionComprasPorcentual: 100,
      },
      porProveedor: [
        { proveedor: "Comercial Andina Ltda.", totalGastado: "110.00", compras: 1 },
        { proveedor: "Distribuidora La Paz", totalGastado: "20.00", compras: 1 },
      ],
      topProductos: [
        { codigo: "LIM-001", producto: "Detergente 1 kg", unidades: 14, totalGastado: "70.00" },
        { codigo: "UTE-002", producto: "Escoba", unidades: 2, totalGastado: "60.00" },
      ],
      // La escoba tiene 3 en stock y mínimo 10; sin consumo, su reposición es 10 − 3 = 7.
      bajoMinimo: [{ codigo: "UTE-002", producto: "Escoba", stockActual: 3, stockMinimo: 10 }],
      reposicion: [{ codigo: "UTE-002", producto: "Escoba", pronostico: 0, reposicionSugerida: 7 }],
    });
  });

  it("no envía teléfonos, direcciones, correos, CI ni contraseñas (FR-012, research A-10)", async () => {
    const datos = await datosInformeCompras(AGOSTO);
    expect(clavesEnProfundidad(datos).filter((clave) => CLAVES_PROHIBIDAS.test(clave))).toEqual([]);
  });

  it("guarda el informe con sus datos, las cuatro secciones, el modelo y el usuario (FR-014, H4 · E2, E3)", async () => {
    const { redactor, peticiones } = redactorQueResponde();

    const { id } = await generarInforme("COMPRAS", AGOSTO, usuarioId, redactor);

    const datos = await datosInformeCompras(AGOSTO);
    // Lo que se envía es exactamente lo que se guarda (research A-09).
    expect(peticiones).toEqual([{ tipo: "COMPRAS", datos }]);
    const informe = await prisma.informeIa.findUniqueOrThrow({ where: { id } });
    expect(informe).toMatchObject({ tipo: "COMPRAS", modelo: "claude-opus-5", usuarioId, datosEntrada: datos });
    expect(informe.desde).toEqual(new Date("2026-08-01T00:00:00Z"));
    expect(informe.hasta).toEqual(new Date("2026-08-31T00:00:00Z"));
    expect(informe.texto).toBe(
      [
        "Resumen\nEn el período se registró actividad normal.",
        "Hallazgos\n- El gasto subió respecto del período anterior.",
        "Alertas\nSin alertas en el período",
        "Recomendaciones\n- Reponer los productos bajo mínimo.",
      ].join("\n\n"),
    );
  });

  it("sin compras vigentes en el período no llama al modelo ni guarda nada (H4 · E6)", async () => {
    const { redactor, peticiones } = redactorQueResponde();

    expect(await mensajeDe(generarInforme("COMPRAS", { desde: "2025-01-01", hasta: "2025-01-31" }, usuarioId, redactor))).toBe(
      "No hay datos suficientes para ese período: no se generó el informe",
    );
    expect(peticiones).toEqual([]);
    expect(await prisma.informeIa.count()).toBe(0);
  });

  it.each<[MotivoDeFalla, string]>([
    ["sin-conexion", "No se pudo generar el informe: sin conexión con el servicio de redacción. Puedes consultar los informes ya generados"],
    ["demora", "El servicio de redacción tardó demasiado: el informe no se generó"],
    ["formato", "La respuesta del servicio no tuvo el formato esperado: el informe no se generó"],
  ])("si la redacción falla por %s, avisa y no guarda nada (FR-015)", async (motivo, mensaje) => {
    expect(await mensajeDe(generarInforme("COMPRAS", AGOSTO, usuarioId, redactorQueFalla(motivo)))).toBe(mensaje);
    expect(MENSAJES_INFORME[motivo]).toBe(mensaje);
    expect(await prisma.informeIa.count()).toBe(0);
  });

  it("una respuesta sin las cuatro secciones no se guarda (FR-015, H4 · E5)", async () => {
    const { redactor } = redactorQueResponde({ resumen: "Solo resumen" });
    expect(await mensajeDe(generarInforme("COMPRAS", AGOSTO, usuarioId, redactor))).toBe(MENSAJES_INFORME.formato);
    expect(await prisma.informeIa.count()).toBe(0);
  });

  it("un error inesperado del redactor se informa como servicio no disponible", async () => {
    const redactor = async () => {
      throw new Error("503 Service Unavailable");
    };
    expect(await mensajeDe(generarInforme("COMPRAS", AGOSTO, usuarioId, redactor))).toBe(MENSAJES_INFORME["sin-conexion"]);
    expect(await prisma.informeIa.count()).toBe(0);
  });
});
