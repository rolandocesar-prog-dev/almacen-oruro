import { describe, expect, it } from "vitest";
import { esquemaFiltroPedidos, esquemaPedido } from "@/esquemas/pedidos";
import { erroresPorRuta } from "@/lib/errores";
import { hoyEnLaPaz } from "@/lib/fechas";

function manana() {
  const fecha = new Date(`${hoyEnLaPaz()}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + 1);
  return fecha.toISOString().slice(0, 10);
}

const linea = (cambios: Record<string, unknown> = {}) => ({ productoId: "1", cantidadSolicitada: "10", ...cambios });

const datosValidos = () => ({
  representanteId: "4",
  fecha: hoyEnLaPaz(),
  observacion: "",
  lineas: [linea(), linea({ productoId: "2", cantidadSolicitada: "3" })],
});

function erroresDe(datos: Record<string, unknown>) {
  const resultado = esquemaPedido.safeParse(datos);
  return resultado.success ? {} : erroresPorRuta(resultado.error);
}

describe("esquemaPedido (FR-001, RN-40)", () => {
  it("acepta un pedido válido y convierte la observación vacía en sin dato", () => {
    expect(esquemaPedido.parse(datosValidos())).toEqual({
      representanteId: 4,
      fecha: hoyEnLaPaz(),
      observacion: undefined,
      lineas: [
        { productoId: 1, cantidadSolicitada: 10 },
        { productoId: 2, cantidadSolicitada: 3 },
      ],
    });
  });

  it("exige el representante", () => {
    expect(erroresDe({ ...datosValidos(), representanteId: "" }).representanteId).toEqual(["Elige un representante"]);
  });

  it("rechaza una fecha futura (Historia 1 · E6)", () => {
    expect(erroresDe({ ...datosValidos(), fecha: manana() }).fecha).toEqual(["La fecha del pedido no puede ser futura"]);
  });

  it("limita la observación a 200 caracteres", () => {
    expect(erroresDe({ ...datosValidos(), observacion: "x".repeat(201) }).observacion).toEqual(["La observación admite hasta 200 caracteres"]);
  });

  it("exige al menos un producto (Historia 1 · E4)", () => {
    expect(erroresDe({ ...datosValidos(), lineas: [] }).lineas).toEqual(["Agrega al menos un producto"]);
  });

  it.each(["0", "-1", "2.5", "1000001", ""])("rechaza la cantidad %j indicando la línea (Historia 1 · E5)", (cantidad) => {
    const errores = erroresDe({ ...datosValidos(), lineas: [linea(), linea({ productoId: "2", cantidadSolicitada: cantidad })] });
    expect(errores).toEqual({ "lineas.1.cantidadSolicitada": ["La cantidad debe ser un número entero entre 1 y 1.000.000"] });
  });

  it("exige el producto de cada línea", () => {
    expect(erroresDe({ ...datosValidos(), lineas: [linea({ productoId: "" })] })).toEqual({ "lineas.0.productoId": ["Elige un producto"] });
  });

  it("rechaza un producto repetido indicando las dos líneas (Historia 1 · E3)", () => {
    const errores = erroresDe({ ...datosValidos(), lineas: [linea(), linea({ cantidadSolicitada: "5" })] });
    expect(errores).toEqual({ "lineas.1.productoId": ["Línea 2: el producto ya está en la línea 1; modifica su cantidad"] });
  });

  it("descarta estado y cantidad entregada enviados por el formulario (RN-41, FR-009)", () => {
    const datos = esquemaPedido.parse({
      ...datosValidos(),
      estado: "ATENDIDO",
      lineas: [{ ...linea(), cantidadEntregada: "10" }],
    });
    expect(datos).not.toHaveProperty("estado");
    expect(datos.lineas[0]).not.toHaveProperty("cantidadEntregada");
  });
});

describe("esquemaFiltroPedidos (FR-013)", () => {
  it("por defecto muestra los pedidos por atender, sin rango y en la página 1", () => {
    expect(esquemaFiltroPedidos.parse({})).toEqual({ estado: "por-atender", pagina: 1 });
  });

  it("un estado o un representante inválidos toman el valor por defecto", () => {
    expect(esquemaFiltroPedidos.parse({ estado: "enviado", representante: "abc", pagina: "-2" })).toEqual({ estado: "por-atender", representante: undefined, pagina: 1 });
  });

  it("acepta un estado concreto, representante y rango de fechas", () => {
    expect(esquemaFiltroPedidos.parse({ estado: "anulados", representante: "3", desde: "2026-09-01", hasta: "2026-09-10", pagina: "2" })).toEqual({
      estado: "anulados",
      representante: 3,
      desde: "2026-09-01",
      hasta: "2026-09-10",
      pagina: 2,
    });
  });

  it("rechaza «desde» posterior a «hasta»", () => {
    const resultado = esquemaFiltroPedidos.safeParse({ desde: "2026-09-10", hasta: "2026-09-01" });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe("La fecha «desde» no puede ser posterior a «hasta»");
  });
});
