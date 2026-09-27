import { describe, expect, it } from "vitest";
import { etiquetaRepresentante } from "@/servicios/catalogos/representantes";

describe("etiquetaRepresentante (D-23, research O-04)", () => {
  it("muestra apellido, nombre y centro de salud", () => {
    expect(etiquetaRepresentante({ nombre: "María", apellido: "Quispe", centroSalud: "Policlínico Norte" })).toBe(
      "Quispe, María · Policlínico Norte",
    );
  });

  it("conserva tildes, eñes y espacios internos tal como están guardados", () => {
    expect(etiquetaRepresentante({ nombre: "José Luis", apellido: "Peña Ávila", centroSalud: "Centro de Salud Oruro" })).toBe(
      "Peña Ávila, José Luis · Centro de Salud Oruro",
    );
  });
});
