import { describe, expect, it } from "vitest";
import { erroresPorRuta } from "@/lib/errores";
import { hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";
import { esquemaAnulacion, esquemaCompra, esquemaFiltroCompras, esquemaVerificacionFactura } from "@/esquemas/compras";

function manana() {
  const fecha = new Date(`${hoyEnLaPaz()}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + 1);
  return fecha.toISOString().slice(0, 10);
}

const linea = (cambios: Record<string, unknown> = {}) => ({ productoId: "1", cantidad: "10", precioUnitario: "12,50", ...cambios });

const datosValidos = () => ({
  proveedorId: "3",
  nroFactura: " 1234 ",
  fecha: hoyEnLaPaz(),
  observacion: "",
  lineas: [linea(), linea({ productoId: "2", cantidad: "4", precioUnitario: "30" })],
});

function erroresDe(datos: Record<string, unknown>) {
  const resultado = esquemaCompra.safeParse(datos);
  return resultado.success ? {} : erroresPorRuta(resultado.error);
}

describe("esquemaCompra (FR-001 a FR-003)", () => {
  it("acepta una compra válida y normaliza factura, observación y precios", () => {
    const datos = esquemaCompra.parse(datosValidos());
    expect(datos).toEqual({
      proveedorId: 3,
      nroFactura: "1234",
      fecha: hoyEnLaPaz(),
      observacion: undefined,
      lineas: [
        { productoId: 1, cantidad: 10, precioUnitario: "12.50" },
        { productoId: 2, cantidad: 4, precioUnitario: "30" },
      ],
    });
  });

  it("valida el Nº de factura", () => {
    expect(erroresDe({ ...datosValidos(), nroFactura: "" }).nroFactura).toEqual(["Escribe el Nº de factura"]);
    for (const nroFactura of ["12-34", "ABC", "1".repeat(21)]) {
      expect(erroresDe({ ...datosValidos(), nroFactura }).nroFactura).toEqual(["El Nº de factura solo admite dígitos, hasta 20"]);
    }
  });

  it("rechaza una fecha futura y una observación larga", () => {
    expect(erroresDe({ ...datosValidos(), fecha: manana() }).fecha).toEqual(["La fecha de la compra no puede ser futura"]);
    expect(erroresDe({ ...datosValidos(), observacion: "a".repeat(201) }).observacion).toEqual(["La observación admite hasta 200 caracteres"]);
  });

  it("exige al menos una línea y proveedor", () => {
    expect(erroresDe({ ...datosValidos(), lineas: [] }).lineas).toEqual(["Agrega al menos un producto"]);
    expect(erroresDe({ ...datosValidos(), proveedorId: "" }).proveedorId).toEqual(["Elige un proveedor"]);
  });

  it.each(["0", "2.5", "", "1000001"])("rechaza la cantidad '%s' indicando la línea", (cantidad) => {
    const errores = erroresDe({ ...datosValidos(), lineas: [linea(), linea({ productoId: "2", cantidad })] });
    expect(errores["lineas.1.cantidad"]).toEqual(["La cantidad debe ser un número entero entre 1 y 1.000.000"]);
  });

  it.each(["0", "12,505", ""])("rechaza el precio '%s'", (precioUnitario) => {
    expect(erroresDe({ ...datosValidos(), lineas: [linea({ precioUnitario })] })["lineas.0.precioUnitario"]).toEqual([
      "Escribe un precio mayor que 0 con hasta 2 decimales",
    ]);
  });

  it("exige el producto de cada línea", () => {
    expect(erroresDe({ ...datosValidos(), lineas: [linea({ productoId: "" })] })["lineas.0.productoId"]).toEqual(["Elige un producto"]);
  });

  it("rechaza un producto repetido indicando las dos líneas (RN-22)", () => {
    const errores = erroresDe({ ...datosValidos(), lineas: [linea(), linea({ productoId: "2" }), linea()] });
    expect(errores["lineas.2.productoId"]).toEqual(["Línea 3: el producto ya está en la línea 1; modifica su cantidad"]);
  });

  it("rechaza un total mayor que 9 999 999 999,99", () => {
    const errores = erroresDe({ ...datosValidos(), lineas: [linea({ cantidad: "1000000", precioUnitario: "10000,01" })] });
    expect(errores.lineas).toEqual(["El total de la compra no puede superar Bs 9.999.999.999,99"]);
  });

  it("descarta subtotal y total enviados: los calcula el servidor (RN-23)", () => {
    const datos = esquemaCompra.parse({ ...datosValidos(), total: "1", lineas: [{ ...linea(), subtotal: "1" }] });
    expect(datos).not.toHaveProperty("total");
    expect(datos.lineas[0]).not.toHaveProperty("subtotal");
  });
});

describe("esquemaFiltroCompras (FR-008)", () => {
  it("por defecto muestra el mes en curso, todas las compras y la página 1", () => {
    expect(esquemaFiltroCompras.parse({})).toEqual({
      desde: inicioDelMesEnCurso(),
      hasta: hoyEnLaPaz(),
      proveedor: undefined,
      estado: "todas",
      factura: undefined,
      pagina: 1,
    });
  });

  it("lee los filtros y usa valores por defecto para los inválidos", () => {
    expect(esquemaFiltroCompras.parse({ desde: "2026-08-01", hasta: "2026-08-31", proveedor: "2", estado: "anuladas", factura: " 12 ", pagina: "3" })).toEqual({
      desde: "2026-08-01",
      hasta: "2026-08-31",
      proveedor: 2,
      estado: "anuladas",
      factura: "12",
      pagina: 3,
    });
    expect(esquemaFiltroCompras.parse({ estado: "otro", proveedor: "x", pagina: "0" })).toMatchObject({ estado: "todas", proveedor: undefined, pagina: 1 });
  });

  it("rechaza letras en la factura y un rango invertido", () => {
    expect(esquemaFiltroCompras.safeParse({ factura: "12a" }).error?.issues[0]?.message).toBe("El Nº de factura solo admite dígitos");
    expect(esquemaFiltroCompras.safeParse({ desde: "2026-09-10", hasta: "2026-09-01" }).error?.issues[0]?.message).toBe(
      "La fecha «desde» no puede ser posterior a «hasta»",
    );
  });
});

describe("esquemaAnulacion (FR-011)", () => {
  it("exige el motivo, hasta 200 caracteres", () => {
    expect(esquemaAnulacion.parse({ motivo: " Cantidades mal cargadas " })).toEqual({ motivo: "Cantidades mal cargadas" });
    expect(esquemaAnulacion.safeParse({ motivo: "  " }).error?.issues[0]?.message).toBe("Escribe el motivo de la anulación");
    expect(esquemaAnulacion.safeParse({ motivo: "a".repeat(201) }).error?.issues[0]?.message).toBe("El motivo admite hasta 200 caracteres");
  });
});

describe("esquemaVerificacionFactura", () => {
  it("exige proveedor y factura con dígitos", () => {
    expect(esquemaVerificacionFactura.safeParse({ proveedorId: 1, nroFactura: "1234" }).success).toBe(true);
    expect(esquemaVerificacionFactura.safeParse({ proveedorId: "", nroFactura: "1234" }).success).toBe(false);
    expect(esquemaVerificacionFactura.safeParse({ proveedorId: 1, nroFactura: "12a" }).success).toBe(false);
  });
});
