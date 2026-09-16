// Invariantes del módulo de IA (F-007; FR-004, FR-007, FR-014, research A-08). Se verifican leyendo el
// código y contando filas antes y después de calcular.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { detalleDePronostico } from "@/servicios/ia/detalle";
import { evaluarCatalogo } from "@/servicios/ia/evaluacion";
import { pronosticoDeProductos } from "@/servicios/ia/pronostico";
import { crearUsuarioDePrueba, vaciarTablas } from "../ayudantes/base-de-datos";
import { productoConSerie } from "../ayudantes/consumo";

const raiz = path.join(import.meta.dirname, "../..");
const leer = (relativa: string) => readFileSync(path.join(raiz, relativa), "utf8");
const ESCRITURA = /\.create\(|\.createMany\(|\.update\(|\.updateMany\(|\.upsert\(|\.delete\(|\.deleteMany\(|\$executeRaw|\$transaction|registrarMovimiento\(/;

/** Todos los archivos .ts y .tsx de una carpeta, recursivamente. */
function archivos(carpeta: string): string[] {
  return readdirSync(path.join(raiz, carpeta), { withFileTypes: true }).flatMap((entrada) => {
    const relativa = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) return archivos(relativa);
    return /\.(ts|tsx|mts)$/.test(entrada.name) ? [relativa] : [];
  });
}

describe("invariantes del código de IA", () => {
  it("serie, método, pronóstico, evaluación y detalle solo leen (FR-004)", () => {
    for (const archivo of ["serie.ts", "holt-winters.ts", "pronostico.ts", "evaluacion.ts", "detalle.ts", "texto-informe.ts"]) {
      expect(leer(`src/servicios/ia/${archivo}`), archivo).not.toMatch(ESCRITURA);
    }
  });

  it("los informes solo se crean: nunca se modifican ni se borran (FR-014)", () => {
    const codigo = leer("src/servicios/ia/informes.ts");
    expect(codigo).toMatch(/informeIa\.create\(/);
    expect(codigo).not.toMatch(/informeIa\.(update|updateMany|upsert|delete|deleteMany)\(/);
    // Ninguna otra escritura en el servicio de informes.
    expect(codigo.replace(/informeIa\.create\(/, "")).not.toMatch(ESCRITURA);
  });

  it("redactor.ts es el único archivo que importa el SDK de Anthropic (research A-08)", () => {
    const conSdk = [...archivos("src"), ...archivos("scripts")].filter((archivo) => leer(archivo).includes("@anthropic-ai/sdk"));
    expect(conSdk.map((archivo) => archivo.split(path.sep).join("/"))).toEqual(["src/servicios/ia/redactor.ts"]);
  });

  it("el pronóstico y la evaluación no dependen del redactor ni de internet (FR-007)", () => {
    for (const archivo of ["serie.ts", "holt-winters.ts", "pronostico.ts", "evaluacion.ts", "detalle.ts"]) {
      const codigo = leer(`src/servicios/ia/${archivo}`);
      expect(codigo, archivo).not.toMatch(/redactor|fetch\(|@anthropic-ai/);
    }
  });

  it("el generador no se ofrece en ninguna pantalla: solo lo usa el comando de instalación (FR-024)", () => {
    // Se buscan importaciones y llamadas: la palabra "generador" aparece en comentarios de la banda de demostración.
    const usos = [...archivos("src/app"), ...archivos("src/componentes")].filter((archivo) =>
      /servicios\/ia\/generador|generarHistorico/.test(leer(archivo)),
    );
    expect(usos).toEqual([]);
    expect(leer("scripts/generar-historico.mts")).toMatch(/generarHistorico/);
  });
});

describe("calcular no escribe (FR-004)", () => {
  let productoId: number;

  beforeAll(async () => {
    await vaciarTablas();
    const { usuario } = await crearUsuarioDePrueba();
    const consumos = Array.from({ length: 30 }, (_, i) => 8 + (i % 12));
    productoId = (await productoConSerie(usuario.id, "2024-03", consumos, { stockMinimo: 5 })).id;
  }, 120_000);

  async function conteos() {
    return {
      movimientos: await prisma.movimientoInventario.count(),
      informes: await prisma.informeIa.count(),
      configuracion: await prisma.configuracion.count(),
      productos: await prisma.producto.findMany({ orderBy: { id: "asc" } }),
    };
  }

  it("pronóstico, evaluación y detalle dejan la base igual", async () => {
    const antes = await conteos();
    await pronosticoDeProductos();
    await evaluarCatalogo();
    await detalleDePronostico(productoId);
    expect(await conteos()).toEqual(antes);
  });
});
