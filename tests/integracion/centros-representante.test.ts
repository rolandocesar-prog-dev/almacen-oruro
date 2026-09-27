// F-009 · Historia 1: selector de centros del formulario de representante (FR-005) y representantes
// de la ficha del centro (FR-007).
import { beforeEach, describe, expect, it } from "vitest";
import { listarCentrosParaRepresentante, obtenerRepresentantesDelCentro } from "@/servicios/catalogos/centros-salud";
import { vaciarTablas } from "../ayudantes/base-de-datos";
import { crearCentroSaludDePrueba, crearRepresentanteDePrueba } from "../ayudantes/catalogos";

describe("listarCentrosParaRepresentante (FR-005)", () => {
  beforeEach(vaciarTablas);

  async function preparar() {
    const ocupado = await crearCentroSaludDePrueba({ nombre: "Policlínico A" });
    const libre = await crearCentroSaludDePrueba({ nombre: "Policlínico B" });
    const conInactivo = await crearCentroSaludDePrueba({ nombre: "Policlínico C" });
    await crearCentroSaludDePrueba({ nombre: "Policlínico D", activo: false });
    const maria = await crearRepresentanteDePrueba({ centroSaludId: ocupado.id });
    await crearRepresentanteDePrueba({ centroSaludId: conInactivo.id, activo: false });
    return { ocupado, libre, conInactivo, maria };
  }

  it("ofrece solo centros activos sin representante activo, ordenados por nombre", async () => {
    const { libre, conInactivo } = await preparar();
    expect(await listarCentrosParaRepresentante()).toEqual([
      { id: libre.id, etiqueta: "Policlínico B", activo: true },
      { id: conInactivo.id, etiqueta: "Policlínico C", activo: true },
    ]);
  });

  it("al modificar, suma el centro actual del representante", async () => {
    const { ocupado, libre, conInactivo, maria } = await preparar();
    expect((await listarCentrosParaRepresentante(maria.id)).map((c) => c.id)).toEqual([ocupado.id, libre.id, conInactivo.id]);
  });

  it("el centro actual inactivo se ofrece marcado, para poder conservarlo al editar (FR-003 de F-002)", async () => {
    const cerrado = await crearCentroSaludDePrueba({ nombre: "Posta Cerrada", activo: false });
    const ines = await crearRepresentanteDePrueba({ centroSaludId: cerrado.id, activo: false });
    expect(await listarCentrosParaRepresentante(ines.id)).toEqual([{ id: cerrado.id, etiqueta: "Posta Cerrada (inactivo)", activo: false }]);
  });
});

describe("obtenerRepresentantesDelCentro (FR-007)", () => {
  beforeEach(vaciarTablas);

  it("devuelve el activo y los anteriores con nombre y CI, ordenados por apellido y sin fechas", async () => {
    const centro = await crearCentroSaludDePrueba();
    const jorge = await crearRepresentanteDePrueba({ nombre: "Jorge", apellido: "Mamani", ci: "300", centroSaludId: centro.id });
    const maria = await crearRepresentanteDePrueba({ nombre: "María", apellido: "Quispe", ci: "200", centroSaludId: centro.id, activo: false });
    const luis = await crearRepresentanteDePrueba({ nombre: "Luis", apellido: "Álvarez", ci: "100", centroSaludId: centro.id, activo: false });

    expect(await obtenerRepresentantesDelCentro(centro.id)).toEqual({
      activo: { id: jorge.id, nombreCompleto: "Mamani, Jorge", ci: "300" },
      anteriores: [
        { id: luis.id, nombreCompleto: "Álvarez, Luis", ci: "100" },
        { id: maria.id, nombreCompleto: "Quispe, María", ci: "200" },
      ],
    });
  });

  it("sin representantes devuelve activo nulo y ninguna persona anterior", async () => {
    const centro = await crearCentroSaludDePrueba();
    expect(await obtenerRepresentantesDelCentro(centro.id)).toEqual({ activo: null, anteriores: [] });
  });
});
