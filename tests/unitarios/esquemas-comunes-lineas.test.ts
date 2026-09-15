// Piezas comunes de los documentos con líneas: compras (F-003) y pedidos (F-004).
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { cantidadEntera, idObligatorio, marcarProductosRepetidos } from "@/esquemas/comunes";
import { erroresPorRuta } from "@/lib/errores";

const MENSAJE = "La cantidad debe ser un número entero entre 1 y 1.000.000";

describe("cantidadEntera", () => {
  const esquema = cantidadEntera(MENSAJE);

  it("acepta enteros de 1 a 1 000 000 escritos como texto", () => {
    expect(esquema.parse("1")).toBe(1);
    expect(esquema.parse("1000000")).toBe(1_000_000);
  });

  it.each(["0", "2.5", "", "1000001", "-1", "abc"])("rechaza %j con el mensaje dado", (valor) => {
    const resultado = esquema.safeParse(valor);
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues.map((problema) => problema.message)).toEqual([MENSAJE]);
  });
});

describe("marcarProductosRepetidos (RN-22, RN-40)", () => {
  const esquema = z
    .object({ lineas: z.array(z.object({ productoId: idObligatorio("Elige un producto") })) })
    .superRefine((documento, contexto) => marcarProductosRepetidos(documento.lineas, contexto));

  it("no marca nada si los productos son distintos", () => {
    expect(esquema.safeParse({ lineas: [{ productoId: "1" }, { productoId: "2" }] }).success).toBe(true);
  });

  it("marca la línea repetida indicando la primera", () => {
    const resultado = esquema.safeParse({ lineas: [{ productoId: "7" }, { productoId: "2" }, { productoId: "7" }] });
    expect(resultado.success).toBe(false);
    expect(erroresPorRuta(resultado.error!)).toEqual({
      "lineas.2.productoId": ["Línea 3: el producto ya está en la línea 1; modifica su cantidad"],
    });
  });
});
