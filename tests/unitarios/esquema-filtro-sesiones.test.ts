import { describe, expect, it } from "vitest";
import { esquemaFiltroSesiones } from "@/esquemas/acceso";
import { hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";

describe("esquemaFiltroSesiones (FR-022)", () => {
  it("sin valores usa el mes en curso y la página 1", () => {
    expect(esquemaFiltroSesiones.parse({})).toEqual({
      usuario: undefined,
      desde: inicioDelMesEnCurso(),
      hasta: hoyEnLaPaz(),
      pagina: 1,
    });
  });

  it("los campos vacíos del formulario toman los valores por defecto", () => {
    const filtro = esquemaFiltroSesiones.parse({ usuario: "", desde: "", hasta: "", pagina: "" });
    expect(filtro.usuario).toBeUndefined();
    expect(filtro.pagina).toBe(1);
  });

  it("convierte usuario y página de texto a número", () => {
    const filtro = esquemaFiltroSesiones.parse({ usuario: "3", desde: "2026-09-01", hasta: "2026-09-10", pagina: "2" });
    expect(filtro).toEqual({ usuario: 3, desde: "2026-09-01", hasta: "2026-09-10", pagina: 2 });
  });

  it("rechaza fechas inválidas", () => {
    expect(esquemaFiltroSesiones.safeParse({ desde: "2026-02-30" }).success).toBe(false);
    expect(esquemaFiltroSesiones.safeParse({ hasta: "13/09/2026" }).success).toBe(false);
  });

  it("rechaza un rango invertido con mensaje en español", () => {
    const resultado = esquemaFiltroSesiones.safeParse({ desde: "2026-09-10", hasta: "2026-09-01" });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe("La fecha «desde» no puede ser posterior a «hasta»");
  });

  it("rechaza una página menor que 1", () => {
    expect(esquemaFiltroSesiones.safeParse({ pagina: "0" }).success).toBe(false);
  });
});
