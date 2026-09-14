import { describe, expect, it } from "vitest";
import { normalizarTexto, recortarEspacios } from "@/lib/texto";

describe("normalizarTexto (RN-10)", () => {
  it("quita espacios extra y pasa a minúsculas", () => {
    expect(normalizarTexto(" Lavandina  1 L ")).toBe("lavandina 1 l");
  });

  it("reconoce como iguales nombres que solo difieren en mayúsculas y espacios", () => {
    expect(normalizarTexto(" lavandina  1 l ")).toBe(normalizarTexto("Lavandina 1 L"));
  });

  it("conserva las tildes", () => {
    expect(normalizarTexto("Pérez")).toBe("pérez");
    expect(normalizarTexto("Pérez")).not.toBe(normalizarTexto("Perez"));
  });
});

describe("recortarEspacios", () => {
  it("quita espacios extra respetando las mayúsculas", () => {
    expect(recortarEspacios("  Juan   Pérez ")).toBe("Juan Pérez");
  });
});
