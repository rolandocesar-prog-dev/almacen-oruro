import { describe, expect, it } from "vitest";
import { esquemaAvisoDistribucion, esquemaDistribucion, esquemaFiltroDistribuciones } from "@/esquemas/distribuciones";
import { erroresPorRuta } from "@/lib/errores";
import { hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";

function manana() {
  const fecha = new Date(`${hoyEnLaPaz()}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + 1);
  return fecha.toISOString().slice(0, 10);
}

const datosValidos = () => ({
  pedidoId: "7",
  nroVale: " 0500 ",
  fecha: hoyEnLaPaz(),
  observacion: "",
  lineas: [
    { pedidoDetalleId: "11", cantidad: "6" },
    { pedidoDetalleId: "12", cantidad: "" },
    { pedidoDetalleId: "13", cantidad: "5" },
  ],
});

function erroresDe(datos: Record<string, unknown>) {
  const resultado = esquemaDistribucion.safeParse(datos);
  return resultado.success ? {} : erroresPorRuta(resultado.error);
}

describe("esquemaDistribucion (FR-001, FR-003, RN-33)", () => {
  it("acepta una distribución válida, conserva los ceros del vale y deja la fila vacía en su lugar", () => {
    expect(esquemaDistribucion.parse(datosValidos())).toEqual({
      pedidoId: 7,
      nroVale: "0500",
      fecha: hoyEnLaPaz(),
      observacion: undefined,
      lineas: [
        { pedidoDetalleId: 11, cantidad: 6 },
        { pedidoDetalleId: 12, cantidad: undefined },
        { pedidoDetalleId: 13, cantidad: 5 },
      ],
    });
  });

  it("exige el Nº de vale", () => {
    expect(erroresDe({ ...datosValidos(), nroVale: "  " }).nroVale).toEqual(["Escribe el Nº de vale"]);
  });

  it.each(["12a", "1".repeat(21)])("rechaza el vale %j", (vale) => {
    expect(erroresDe({ ...datosValidos(), nroVale: vale }).nroVale).toEqual(["El Nº de vale solo admite dígitos, hasta 20"]);
  });

  it("rechaza una fecha futura (Historia 1 · E8)", () => {
    expect(erroresDe({ ...datosValidos(), fecha: manana() }).fecha).toEqual(["La fecha de la distribución no puede ser futura"]);
  });

  it("limita la observación a 200 caracteres", () => {
    expect(erroresDe({ ...datosValidos(), observacion: "x".repeat(201) }).observacion).toEqual(["La observación admite hasta 200 caracteres"]);
  });

  it.each(["0", "-1", "2.5", "1000001"])("rechaza la cantidad %j en su fila", (cantidad) => {
    const datos = datosValidos();
    datos.lineas[2] = { pedidoDetalleId: "13", cantidad };
    expect(erroresDe(datos)).toEqual({ "lineas.2.cantidad": ["La cantidad debe ser un número entero entre 1 y 1.000.000"] });
  });

  it("exige al menos una línea con cantidad (Historia 1 · E7)", () => {
    const datos = { ...datosValidos(), lineas: datosValidos().lineas.map((linea) => ({ ...linea, cantidad: "" })) };
    expect(erroresDe(datos)).toEqual({ lineas: ["Entrega al menos un producto: escribe la cantidad en una línea"] });
  });

  it("rechaza una línea del pedido repetida (FR-003)", () => {
    const datos = datosValidos();
    datos.lineas[2] = { pedidoDetalleId: "11", cantidad: "1" };
    expect(erroresDe(datos)).toEqual({ "lineas.2.pedidoDetalleId": ["Línea 3: esa línea del pedido ya está en la línea 1"] });
  });

  it("descarta estado, usuario y representante enviados por el formulario (X-08)", () => {
    const datos = esquemaDistribucion.parse({ ...datosValidos(), estado: "ANULADA", usuarioId: "1", representanteId: "2" });
    expect(datos).not.toHaveProperty("estado");
    expect(datos).not.toHaveProperty("usuarioId");
    expect(datos).not.toHaveProperty("representanteId");
  });
});

describe("esquemaAvisoDistribucion", () => {
  it("reconoce el aviso de registro e ignora otros valores", () => {
    expect(esquemaAvisoDistribucion.parse({ aviso: "registrada" })).toEqual({ aviso: "registrada" });
    expect(esquemaAvisoDistribucion.parse({ aviso: "otra" })).toEqual({ aviso: undefined });
  });
});

describe("esquemaFiltroDistribuciones (FR-010)", () => {
  it("por defecto muestra el mes en curso, todas las distribuciones y la página 1", () => {
    expect(esquemaFiltroDistribuciones.parse({})).toEqual({
      desde: inicioDelMesEnCurso(),
      hasta: hoyEnLaPaz(),
      representante: undefined,
      producto: undefined,
      estado: "todas",
      vale: undefined,
      pagina: 1,
    });
  });

  it("valores inválidos toman el valor por defecto", () => {
    expect(esquemaFiltroDistribuciones.parse({ estado: "vigentes", representante: "abc", producto: "-3", pagina: "0" })).toMatchObject({
      estado: "todas",
      representante: undefined,
      producto: undefined,
      pagina: 1,
    });
  });

  it("acepta representante, producto, estado y vale", () => {
    expect(esquemaFiltroDistribuciones.parse({ representante: "2", producto: "5", estado: "anuladas", vale: "05" })).toMatchObject({
      representante: 2,
      producto: 5,
      estado: "anuladas",
      vale: "05",
    });
  });

  it("rechaza un vale con letras y «desde» posterior a «hasta»", () => {
    expect(esquemaFiltroDistribuciones.safeParse({ vale: "12a" }).error?.issues[0]?.message).toBe("El Nº de vale solo admite dígitos");
    expect(esquemaFiltroDistribuciones.safeParse({ desde: "2026-09-10", hasta: "2026-09-01" }).error?.issues[0]?.message).toBe(
      "La fecha «desde» no puede ser posterior a «hasta»",
    );
  });
});
