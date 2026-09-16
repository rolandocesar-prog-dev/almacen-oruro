// Informe IA de distribuciones con un redactor falso (F-007, Historia 5; FR-011, FR-012, FR-015).
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { anularDistribucion } from "@/servicios/distribuciones";
import { datosInformeDistribuciones, generarInforme, MENSAJES_INFORME } from "@/servicios/ia/informes";
import { anularPedido, registrarPedido } from "@/servicios/pedidos";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { crearRepresentanteDePrueba } from "../ayudantes/catalogos";
import { distribuir, productoConStock } from "../ayudantes/consumo";
import { CLAVES_PROHIBIDAS, clavesEnProfundidad, redactorQueFalla, redactorQueResponde } from "../ayudantes/redactor-falso";

const AGOSTO = { desde: "2026-08-01", hasta: "2026-08-31" };
let usuarioId: number;
let ciDeQuispe: string;

async function mensajeDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return (error as ErrorDeNegocio).message;
}

describe("Informe IA de distribuciones (Historia 5)", () => {
  beforeAll(async () => {
    await vaciarTablas();
    usuarioId = (await crearUsuarioDePrueba()).usuario.id;
    const quispe = await crearRepresentanteDePrueba({ nombre: "María", apellido: "Quispe", servicio: "Enfermería", ci: "4821507" });
    const mamani = await crearRepresentanteDePrueba({ nombre: "Jorge", apellido: "Mamani", servicio: "Laboratorio" });
    ciDeQuispe = quispe.ci;
    const lavandina = await productoConStock(usuarioId, 100, { nombre: "Lavandina 1 L" });
    const guantes = await productoConStock(usuarioId, 100, { nombre: "Guantes de nitrilo" });

    // Julio: 5 unidades.
    await distribuir(usuarioId, lavandina.id, 5, "2026-07-10", quispe.id);
    // Agosto: 6 + 4 + 3 = 13 vigentes y 2 anuladas que no cuentan.
    await distribuir(usuarioId, lavandina.id, 6, "2026-08-10", quispe.id);
    await distribuir(usuarioId, lavandina.id, 4, "2026-08-12", mamani.id);
    await distribuir(usuarioId, guantes.id, 3, "2026-08-14", quispe.id);
    const anulada = await distribuir(usuarioId, guantes.id, 2, "2026-08-16", mamani.id);
    await anularDistribucion(anulada, "Vale registrado por duplicado", usuarioId);
    // Un pedido anulado en agosto.
    const { id } = await registrarPedido(
      { representanteId: mamani.id, fecha: "2026-08-20", observacion: undefined, lineas: [{ productoId: guantes.id, cantidadSolicitada: 1 }] },
      usuarioId,
    );
    await anularPedido(id, "Pedido repetido por error", usuarioId);
  });

  beforeEach(async () => {
    await prisma.informeIa.deleteMany();
  });

  it("calcula lo entregado por representante y producto, los pedidos por estado y la comparación (FR-011, H5 · E1)", async () => {
    const datos = await datosInformeDistribuciones(AGOSTO);
    if (!datos) throw new Error("debía haber datos");

    expect(datos.periodo).toEqual({ desde: "2026-08-01", hasta: "2026-08-31", anteriorDesde: "2026-07-01", anteriorHasta: "2026-07-31" });
    expect(datos.totales).toEqual({ unidadesEntregadas: 13, unidadesEntregadasAnterior: 5, variacionPorcentual: 160 });
    expect(datos.porRepresentante).toEqual([
      { representante: "Quispe, María", servicio: "Enfermería", unidades: 9 },
      { representante: "Mamani, Jorge", servicio: "Laboratorio", unidades: 4 },
    ]);
    expect(datos.topProductos.map(({ producto, unidades }) => ({ producto, unidades }))).toEqual([
      { producto: "Lavandina 1 L", unidades: 10 },
      { producto: "Guantes de nitrilo", unidades: 3 },
    ]);
    // Tres pedidos atendidos, el de la distribución anulada volvió a pendiente y uno anulado.
    expect(datos.pedidosPorEstado).toEqual({ PENDIENTE: 1, PARCIAL: 0, ATENDIDO: 3, ANULADO: 1 });
    // El pronóstico del mes acompaña a los productos principales, en el mismo orden.
    expect(datos.pronostico.map((fila) => fila.producto)).toEqual(["Lavandina 1 L", "Guantes de nitrilo"]);
    for (const fila of datos.pronostico) expect(fila.pronostico).toBeGreaterThanOrEqual(0);
  });

  it("no envía CI ni datos de contacto de los representantes (FR-012, research A-10)", async () => {
    const datos = await datosInformeDistribuciones(AGOSTO);
    expect(clavesEnProfundidad(datos).filter((clave) => CLAVES_PROHIBIDAS.test(clave))).toEqual([]);
    expect(JSON.stringify(datos)).not.toContain(ciDeQuispe);
  });

  it("guarda el informe de distribuciones con los datos enviados (H5 · E2)", async () => {
    const { redactor, peticiones } = redactorQueResponde();

    const { id } = await generarInforme("DISTRIBUCIONES", AGOSTO, usuarioId, redactor);

    const informe = await prisma.informeIa.findUniqueOrThrow({ where: { id } });
    expect(informe.tipo).toBe("DISTRIBUCIONES");
    expect(peticiones).toHaveLength(1);
    expect(peticiones[0]?.tipo).toBe("DISTRIBUCIONES");
    expect(informe.datosEntrada).toEqual(peticiones[0]?.datos);
  });

  it("respeta los mismos rechazos que el informe de compras (H5 · E2)", async () => {
    const { redactor, peticiones } = redactorQueResponde();
    expect(await mensajeDe(generarInforme("DISTRIBUCIONES", { desde: "2025-01-01", hasta: "2025-01-31" }, usuarioId, redactor))).toBe(
      MENSAJES_INFORME.sinDatos,
    );
    expect(peticiones).toEqual([]);
    expect(await mensajeDe(generarInforme("DISTRIBUCIONES", AGOSTO, usuarioId, redactorQueFalla("demora")))).toBe(MENSAJES_INFORME.demora);
    expect(await prisma.informeIa.count()).toBe(0);
  });

  it("un período con solo distribuciones anuladas no tiene datos", async () => {
    expect(await datosInformeDistribuciones({ desde: "2026-08-16", hasta: "2026-08-16" })).toBeNull();
  });
});
