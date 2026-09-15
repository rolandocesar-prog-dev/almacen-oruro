import { describe, expect, it } from "vitest";
import { z } from "zod";
import { erroresPorRuta } from "@/lib/errores";

const esquema = z.object({
  proveedorId: z.number({ error: "Elige un proveedor" }),
  lineas: z.array(
    z.object({
      cantidad: z.number().int({ error: "Debe ser entero" }).min(1, { error: "Mínimo 1" }),
      codigo: z.string().min(3, { error: "Mínimo 3 caracteres" }).regex(/^\d+$/, { error: "Solo dígitos" }).optional(),
    }),
  ),
});

describe("erroresPorRuta (FR-007)", () => {
  it("agrupa los mensajes por la ruta completa de cada campo", () => {
    const resultado = esquema.safeParse({ lineas: [{ cantidad: 3 }, { cantidad: 0 }] });
    expect(resultado.success).toBe(false);
    if (resultado.success) return;

    expect(erroresPorRuta(resultado.error)).toEqual({
      proveedorId: ["Elige un proveedor"],
      "lineas.1.cantidad": ["Mínimo 1"],
    });
  });

  it("junta varios mensajes de la misma ruta", () => {
    const resultado = esquema.safeParse({ proveedorId: 1, lineas: [{ cantidad: 2, codigo: "a" }] });
    if (resultado.success) throw new Error("debía fallar");

    expect(erroresPorRuta(resultado.error)["lineas.0.codigo"]).toEqual(["Mínimo 3 caracteres", "Solo dígitos"]);
  });
});
