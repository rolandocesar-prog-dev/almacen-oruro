// FR-002 y SC-005: los catálogos no se borran y nunca escriben el stock actual (RN-15, principio III).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as categorias from "@/servicios/catalogos/categorias";
import * as centrosSalud from "@/servicios/catalogos/centros-salud";
import * as comun from "@/servicios/catalogos/comun";
import * as productos from "@/servicios/catalogos/productos";
import * as proveedorProducto from "@/servicios/catalogos/proveedor-producto";
import * as proveedores from "@/servicios/catalogos/proveedores";
import * as representantes from "@/servicios/catalogos/representantes";
import * as unidadesMedida from "@/servicios/catalogos/unidades-medida";

const carpetaServicios = path.join(import.meta.dirname, "../../src/servicios/catalogos");

describe("catálogos sin borrado (FR-002)", () => {
  it("ningún servicio de catálogo exporta funciones de borrado", () => {
    const modulos = [categorias, centrosSalud, comun, productos, proveedorProducto, proveedores, representantes, unidadesMedida];
    const nombres = modulos.flatMap((modulo) => Object.keys(modulo));

    expect(nombres.length).toBeGreaterThan(30);
    expect(nombres.filter((nombre) => /borrar|eliminar|delete/i.test(nombre))).toEqual([]);
  });

  it("ningún servicio de catálogo llama a delete de Prisma", () => {
    for (const archivo of readdirSync(carpetaServicios)) {
      const codigo = readFileSync(path.join(carpetaServicios, archivo), "utf8");
      expect(codigo, archivo).not.toMatch(/\.delete(Many)?\(/);
    }
  });
});

describe("el stock no se escribe desde los catálogos (SC-005, RN-15)", () => {
  it("ningún archivo de src/servicios/catalogos pone stockActual dentro de un data: de Prisma", () => {
    const archivos = readdirSync(carpetaServicios);
    expect(archivos).toContain("productos.ts");

    for (const archivo of archivos) {
      const codigo = readFileSync(path.join(carpetaServicios, archivo), "utf8");
      // Cada "data:" con su objeto hasta la llave que lo cierra (los datos de los catálogos no anidan
      // más de un nivel), y también los objetos que arma prepararDatos para ese data:.
      const bloquesData = codigo.match(/data:\s*\{[^}]*\}/g) ?? [];
      const preparar = codigo.match(/function prepararDatos[\s\S]*?\n\}/g) ?? [];
      for (const bloque of [...bloquesData, ...preparar]) {
        expect(bloque, archivo).not.toMatch(/stockActual/);
      }
    }
  });
});
