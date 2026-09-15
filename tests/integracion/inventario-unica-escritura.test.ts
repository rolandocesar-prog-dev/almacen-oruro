// FR-010 y FR-015, principio III: solo registrarMovimiento escribe el stock, y compras y movimientos
// no se editan ni se borran. Se verifica leyendo el código fuente.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as compras from "@/servicios/compras";
import * as inventario from "@/servicios/inventario";

const raiz = path.join(import.meta.dirname, "../../src");
const inventarioTs = path.join(raiz, "servicios", "inventario.ts");

function archivosDe(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return nombre === "generado" ? [] : archivosDe(ruta);
    return /\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

const archivos = archivosDe(raiz);

describe("única escritura del stock (FR-015, principio III)", () => {
  it("solo src/servicios/inventario.ts pone stockActual dentro de un data: de Prisma", () => {
    expect(archivos.length).toBeGreaterThan(50);
    const conEscritura = archivos.filter((archivo) => {
      const codigo = readFileSync(archivo, "utf8");
      // Cada "data:" con su objeto hasta la llave que lo cierra.
      return (codigo.match(/data:\s*\{[^}]*\}/g) ?? []).some((bloque) => bloque.includes("stockActual"));
    });
    expect(conEscritura.map((archivo) => path.relative(raiz, archivo))).toEqual([path.relative(raiz, inventarioTs)]);
  });

  it("ningún archivo actualiza ni borra movimientos del kardex", () => {
    for (const archivo of archivos) {
      const codigo = readFileSync(archivo, "utf8");
      expect(codigo, archivo).not.toMatch(/movimientoInventario\.(update|updateMany|delete|deleteMany|upsert)\(/);
    }
  });
});

describe("compras inmutables (FR-010, D-16)", () => {
  it("los servicios de compras e inventario no exportan funciones para editar ni borrar", () => {
    const nombres = [...Object.keys(compras), ...Object.keys(inventario)];
    expect(nombres).toContain("anularCompra");
    expect(nombres.filter((nombre) => /editar|modificar|borrar|eliminar|delete/i.test(nombre))).toEqual([]);
  });

  it("no llaman a delete de Prisma", () => {
    for (const archivo of [path.join(raiz, "servicios", "compras.ts"), inventarioTs]) {
      expect(readFileSync(archivo, "utf8"), archivo).not.toMatch(/\.delete(Many)?\(/);
    }
  });
});
