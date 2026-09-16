// Consulta de informes guardados (F-007, Historia 6; FR-014, FR-016).
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { generarInforme, listarInformes, obtenerInforme } from "@/servicios/ia/informes";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { distribuir, productoConStock } from "../ayudantes/consumo";
import { redactorQueResponde, SECCIONES_DE_PRUEBA } from "../ayudantes/redactor-falso";

const AGOSTO = { desde: "2026-08-01", hasta: "2026-08-31" };
let ids: { compras: number; distribuciones: number; segundaDeCompras: number };
let usuario: { id: number; nombre: string; apellido: string };

describe("Consulta de informes guardados (Historia 6)", () => {
  beforeAll(async () => {
    await vaciarTablas();
    usuario = (await crearUsuarioDePrueba({ nombre: "Rolando", apellido: "Vásquez" })).usuario;
    const producto = await productoConStock(usuario.id, 20, { fechaCompra: "2026-08-02" });
    await distribuir(usuario.id, producto.id, 5, "2026-08-10");

    const compras = await generarInforme("COMPRAS", AGOSTO, usuario.id, redactorQueResponde().redactor);
    const distribuciones = await generarInforme("DISTRIBUCIONES", AGOSTO, usuario.id, redactorQueResponde().redactor);
    const segunda = await generarInforme(
      "COMPRAS",
      AGOSTO,
      usuario.id,
      redactorQueResponde({ ...SECCIONES_DE_PRUEBA, resumen: "Segunda versión del informe." }).redactor,
    );
    ids = { compras: compras.id, distribuciones: distribuciones.id, segundaDeCompras: segunda.id };
  });

  it("lista del más reciente al más antiguo con tipo, período, modelo y usuario (FR-016, H6 · E1)", async () => {
    const { informes } = await listarInformes({ tipo: "todos" });

    expect(informes.map((informe) => informe.id)).toEqual([ids.segundaDeCompras, ids.distribuciones, ids.compras]);
    expect(informes[0]).toMatchObject({
      tipo: "COMPRAS",
      desde: "2026-08-01",
      hasta: "2026-08-31",
      modelo: "claude-opus-5",
      usuario: "Rolando Vásquez",
    });
    expect(informes[0]?.creadoEn).toBeInstanceOf(Date);
  });

  it("filtra por tipo", async () => {
    expect((await listarInformes({ tipo: "COMPRAS" })).informes.map((i) => i.id)).toEqual([ids.segundaDeCompras, ids.compras]);
    expect((await listarInformes({ tipo: "DISTRIBUCIONES" })).informes.map((i) => i.id)).toEqual([ids.distribuciones]);
  });

  it("la ficha trae el texto, los datos de entrada y el usuario (FR-013, H6 · E2)", async () => {
    const informe = await obtenerInforme(ids.compras);
    const guardado = await prisma.informeIa.findUniqueOrThrow({ where: { id: ids.compras } });

    expect(informe).toMatchObject({ id: ids.compras, tipo: "COMPRAS", texto: guardado.texto, usuario: "Rolando Vásquez" });
    expect(informe?.datosEntrada).toEqual(guardado.datosEntrada);
    expect(informe?.texto).toContain("Resumen");
  });

  it("un id inexistente devuelve null", async () => {
    expect(await obtenerInforme(999_999)).toBeNull();
  });

  it("generar otra vez el mismo tipo y período crea otro informe y no toca el anterior (H6 · E4)", async () => {
    const primero = await prisma.informeIa.findUniqueOrThrow({ where: { id: ids.compras } });
    const segundo = await prisma.informeIa.findUniqueOrThrow({ where: { id: ids.segundaDeCompras } });

    expect(segundo.id).not.toBe(primero.id);
    expect(primero.texto).toContain("En el período se registró actividad normal.");
    expect(segundo.texto).toContain("Segunda versión del informe.");
  });

  it("consultar no escribe nada", async () => {
    const antes = await prisma.informeIa.findMany({ orderBy: { id: "asc" } });
    await listarInformes({ tipo: "todos" });
    await obtenerInforme(ids.compras);
    expect(await prisma.informeIa.findMany({ orderBy: { id: "asc" } })).toEqual(antes);
  });
});
