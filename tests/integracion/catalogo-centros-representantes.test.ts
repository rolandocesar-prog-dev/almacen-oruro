// Historia 4 · Centro de salud y representantes (FR-009, FR-010, FR-022, RN-11, RN-13, RN-14, RN-17).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ErrorDeNegocio } from "@/lib/errores";
import {
  desactivarCentroSalud,
  listarCentrosSalud,
  listarCentrosParaRepresentante,
  modificarCentroSalud,
  reactivarCentroSalud,
  registrarCentroSalud,
} from "@/servicios/catalogos/centros-salud";
import {
  contarPedidosPorAtender,
  desactivarRepresentante,
  listarRepresentantes,
  listarRepresentantesParaSelector,
  modificarRepresentante,
  reactivarRepresentante,
  registrarRepresentante,
} from "@/servicios/catalogos/representantes";
import { registrarDistribucion } from "@/servicios/distribuciones";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { datosDistribucion, prepararPedidoConStock } from "../ayudantes/distribuciones";
import {
  crearCentroSaludDePrueba,
  crearPedidoConSaldo,
  crearRepresentanteDePrueba,
} from "../ayudantes/catalogos";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

describe("centros de salud", () => {
  beforeEach(vaciarTablas);

  it("registra con nombre normalizado y rechaza el repetido, con enlace si está inactivo", async () => {
    const { id } = await registrarCentroSalud({ nombre: " Hospital  San Juan de Dios " });
    const guardado = await prisma.centroSalud.findUniqueOrThrow({ where: { id } });
    expect(guardado.nombre).toBe("Hospital San Juan de Dios");
    expect(guardado.nombreNormalizado).toBe("hospital san juan de dios");

    const error = await errorDe(registrarCentroSalud({ nombre: "HOSPITAL SAN JUAN DE DIOS" }));
    expect(error.message).toBe("Ya existe un centro de salud con el nombre 'Hospital San Juan de Dios'");
    expect(error.enlace).toBeUndefined();

    await prisma.centroSalud.update({ where: { id }, data: { activo: false } });
    const errorInactivo = await errorDe(registrarCentroSalud({ nombre: "hospital san juan de dios" }));
    expect(errorInactivo.message).toBe("Ya existe un centro de salud inactivo con el nombre 'Hospital San Juan de Dios'");
    expect(errorInactivo.enlace).toEqual({ texto: "Ver y reactivar", ruta: `/centros-salud/${id}` });
  });

  it("al modificar rechaza el nombre de otro centro, pero no el propio", async () => {
    const centro = await crearCentroSaludDePrueba({ nombre: "Centro Norte" });
    await crearCentroSaludDePrueba({ nombre: "Centro Sur" });

    expect((await errorDe(modificarCentroSalud(centro.id, { nombre: "centro sur" }))).message).toBe(
      "Ya existe un centro de salud con el nombre 'Centro Sur'",
    );
    await expect(modificarCentroSalud(centro.id, { nombre: "Centro Norte", telefono: "5251234" })).resolves.toBeUndefined();
  });

  it("rechaza desactivar con su representante activo, nombrándolo (RN-13, FR-027)", async () => {
    const centro = await crearCentroSaludDePrueba();
    await crearRepresentanteDePrueba({ nombre: "María", apellido: "Quispe", centroSaludId: centro.id });
    expect((await errorDe(desactivarCentroSalud(centro.id))).message).toBe("No se puede desactivar: su representante activo es 'Quispe, María'");

    await prisma.representante.updateMany({ where: { centroSaludId: centro.id }, data: { activo: false } });
    await desactivarCentroSalud(centro.id);
    await reactivarCentroSalud(centro.id);
    expect((await prisma.centroSalud.findUniqueOrThrow({ where: { id: centro.id } })).activo).toBe(true);
  });

  it("el selector no ofrece centros inactivos ni ocupados (RN-18) y el listado cuenta representantes activos", async () => {
    const activo = await crearCentroSaludDePrueba({ nombre: "Hospital General" });
    await crearCentroSaludDePrueba({ nombre: "Posta cerrada", activo: false });
    await crearRepresentanteDePrueba({ centroSaludId: activo.id });

    // El único centro activo ya tiene representante: no queda ninguno para uno nuevo (detalle en centros-representante.test.ts).
    expect(await listarCentrosParaRepresentante()).toEqual([]);
    expect(await listarCentrosSalud({ estado: "activos" })).toEqual([
      { id: activo.id, nombre: "Hospital General", telefono: null, activo: true, representantesActivos: 1 },
    ]);
  });
});

describe("representantes", () => {
  beforeEach(vaciarTablas);

  const datosBase = { nombre: "Ana", apellido: "Quispe", ci: "4567890" };

  it("registra y rechaza un CI repetido, con enlace si el existente está inactivo", async () => {
    const centro = await crearCentroSaludDePrueba();
    const { id } = await registrarRepresentante({ ...datosBase, centroSaludId: centro.id });

    const error = await errorDe(registrarRepresentante({ ...datosBase, nombre: "Otra", centroSaludId: centro.id }));
    expect(error.message).toBe("Ya existe un representante con el CI '4567890'");
    expect(error.campo).toBe("ci");

    await prisma.representante.update({ where: { id }, data: { activo: false } });
    const errorInactivo = await errorDe(registrarRepresentante({ ...datosBase, centroSaludId: centro.id }));
    expect(errorInactivo.message).toBe("Ya existe un representante inactivo con el CI '4567890'");
    expect(errorInactivo.enlace).toEqual({ texto: "Ver y reactivar", ruta: `/representantes/${id}` });
  });

  it("rechaza registrar con un centro de salud inactivo (RN-14)", async () => {
    const centro = await crearCentroSaludDePrueba({ nombre: "Posta cerrada", activo: false });
    expect((await errorDe(registrarRepresentante({ ...datosBase, centroSaludId: centro.id }))).message).toBe(
      "El centro de salud 'Posta cerrada' está inactivo: elige uno activo",
    );
  });

  it("al modificar rechaza el CI de otro representante, pero no el propio", async () => {
    const representante = await crearRepresentanteDePrueba({ ci: "111" });
    await crearRepresentanteDePrueba({ ci: "222" });
    const base = { ...datosBase, centroSaludId: representante.centroSaludId };

    expect((await errorDe(modificarRepresentante(representante.id, { ...base, ci: "222" }))).message).toBe(
      "Ya existe un representante con el CI '222'",
    );
    await expect(modificarRepresentante(representante.id, { ...base, ci: "111" })).resolves.toBeUndefined();
  });

  it("desactiva aunque tenga pedidos PENDIENTE o PARCIAL, que siguen a su nombre y se pueden distribuir (RN-13 modificada, FR-006, FR-008)", async () => {
    const { usuario, representante, productos, pedido } = await prepararPedidoConStock({ lineas: [{ solicitada: 10, stock: 20 }] });
    await crearPedidoConSaldo({ representanteId: representante.id, productoId: productos[0]!.id, estado: "PARCIAL", entregada: 3 });
    await crearPedidoConSaldo({ representanteId: representante.id, productoId: productos[0]!.id, estado: "ATENDIDO", entregada: 10 });

    // El aviso previo cuenta solo los que falta atender.
    expect(await contarPedidosPorAtender(representante.id)).toBe(2);
    await expect(desactivarRepresentante(representante.id)).resolves.toBeUndefined();

    await registrarDistribucion(datosDistribucion(pedido, [4]), usuario.id);
    const despues = await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id }, select: { representanteId: true, estado: true } });
    expect(despues).toEqual({ representanteId: representante.id, estado: "PARCIAL" });
  });

  it("rechaza reactivar si su centro de salud está inactivo (RN-17)", async () => {
    const centro = await crearCentroSaludDePrueba({ nombre: "Hospital General" });
    const representante = await crearRepresentanteDePrueba({ centroSaludId: centro.id, activo: false });
    await prisma.centroSalud.update({ where: { id: centro.id }, data: { activo: false } });

    expect((await errorDe(reactivarRepresentante(representante.id))).message).toBe("Primero reactiva el centro de salud 'Hospital General'");

    await prisma.centroSalud.update({ where: { id: centro.id }, data: { activo: true } });
    await reactivarRepresentante(representante.id);
    expect((await prisma.representante.findUniqueOrThrow({ where: { id: representante.id } })).activo).toBe(true);
  });

  it("el selector solo ofrece activos como 'Apellido, Nombre · Centro de salud' y el listado ordena por apellido", async () => {
    // Un representante activo por centro (RN-18); el inactivo puede compartir centro.
    const centro = await crearCentroSaludDePrueba({ nombre: "Hospital General" });
    const policlinico = await crearCentroSaludDePrueba({ nombre: "Policlínico Norte" });
    const ana = await crearRepresentanteDePrueba({ nombre: "Ana", apellido: "Quispe", centroSaludId: centro.id });
    const luis = await crearRepresentanteDePrueba({ nombre: "Luis", apellido: "Álvarez", centroSaludId: policlinico.id });
    await crearRepresentanteDePrueba({ apellido: "Inactivo", activo: false, centroSaludId: centro.id });

    expect(await listarRepresentantesParaSelector()).toEqual([
      { id: luis.id, etiqueta: "Álvarez, Luis · Policlínico Norte", activo: true },
      { id: ana.id, etiqueta: "Quispe, Ana · Hospital General", activo: true },
    ]);
    expect((await listarRepresentantes({ estado: "activos" }))[0]).toMatchObject({
      nombreCompleto: "Álvarez, Luis",
      etiqueta: "Álvarez, Luis · Policlínico Norte",
      centroSalud: "Policlínico Norte",
    });
  });
});

describe("un representante activo por centro (RN-18, F-009)", () => {
  beforeEach(vaciarTablas);

  const persona = (centroSaludId: number, ci: string) => ({ nombre: "Jorge", apellido: "Mamani", ci, centroSaludId });

  it("rechaza registrar en un centro que ya tiene representante activo, nombrándolo (FR-002)", async () => {
    const centro = await crearCentroSaludDePrueba({ nombre: "Policlínico A" });
    await crearRepresentanteDePrueba({ nombre: "María", apellido: "Quispe", centroSaludId: centro.id });

    const error = await errorDe(registrarRepresentante(persona(centro.id, "7654321")));
    expect(error.message).toBe(
      "El centro de salud 'Policlínico A' ya tiene como representante activo a 'Quispe, María': desactívalo antes de registrar a otra persona",
    );
    expect(error.campo).toBe("centroSaludId");
  });

  it("acepta registrar si el representante anterior del centro está inactivo (reemplazo, D-22)", async () => {
    const centro = await crearCentroSaludDePrueba();
    await crearRepresentanteDePrueba({ centroSaludId: centro.id, activo: false });
    await expect(registrarRepresentante(persona(centro.id, "7654321"))).resolves.toMatchObject({ id: expect.any(Number) });
  });

  it("rechaza reactivar si el centro ya tiene otro representante activo (FR-003)", async () => {
    const centro = await crearCentroSaludDePrueba({ nombre: "Policlínico A" });
    const maria = await crearRepresentanteDePrueba({ nombre: "María", apellido: "Quispe", centroSaludId: centro.id, activo: false });
    await crearRepresentanteDePrueba({ nombre: "Jorge", apellido: "Mamani", centroSaludId: centro.id });

    expect((await errorDe(reactivarRepresentante(maria.id))).message).toBe(
      "El centro de salud 'Policlínico A' ya tiene como representante activo a 'Mamani, Jorge': desactívalo antes de reactivar a este representante",
    );
  });

  it("rechaza cambiar un representante activo a un centro ocupado y permite los demás cambios (FR-003)", async () => {
    const a = await crearCentroSaludDePrueba({ nombre: "Policlínico A" });
    const b = await crearCentroSaludDePrueba({ nombre: "Policlínico B" });
    const maria = await crearRepresentanteDePrueba({ nombre: "María", apellido: "Quispe", ci: "111", centroSaludId: a.id });
    await crearRepresentanteDePrueba({ nombre: "Jorge", apellido: "Mamani", centroSaludId: b.id });
    const datosDeMaria = { nombre: "María", apellido: "Quispe", ci: "111" };

    expect((await errorDe(modificarRepresentante(maria.id, { ...datosDeMaria, centroSaludId: b.id }))).message).toBe(
      "El centro de salud 'Policlínico B' ya tiene como representante activo a 'Mamani, Jorge': desactívalo antes de cambiar a este representante de centro",
    );
    // Sin cambiar de centro, la regla no se evalúa.
    await expect(modificarRepresentante(maria.id, { ...datosDeMaria, telefono: "52-12345", centroSaludId: a.id })).resolves.toBeUndefined();

    // Un representante inactivo se puede mover a un centro ocupado: no queda activo en él.
    const ines = await crearRepresentanteDePrueba({ nombre: "Inés", apellido: "Condori", ci: "222", activo: false });
    await expect(modificarRepresentante(ines.id, { nombre: "Inés", apellido: "Condori", ci: "222", centroSaludId: b.id })).resolves.toBeUndefined();
  });

  it("ante dos registros simultáneos en el mismo centro, acepta uno y rechaza el otro con el mismo mensaje (SC-001)", async () => {
    const centro = await crearCentroSaludDePrueba({ nombre: "Policlínico A" });

    const resultados = await Promise.allSettled([
      registrarRepresentante({ nombre: "María", apellido: "Quispe", ci: "111", centroSaludId: centro.id }),
      registrarRepresentante({ nombre: "Jorge", apellido: "Mamani", ci: "222", centroSaludId: centro.id }),
    ]);

    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rechazo = resultados.find((r) => r.status === "rejected");
    expect(rechazo?.reason).toBeInstanceOf(ErrorDeNegocio);
    expect((rechazo?.reason as ErrorDeNegocio).message).toMatch(
      /^El centro de salud 'Policlínico A' ya tiene como representante activo a '(Quispe, María|Mamani, Jorge)': desactívalo antes de registrar a otra persona$/,
    );
    expect(await prisma.representante.count({ where: { centroSaludId: centro.id, activo: true } })).toBe(1);
  });
});
