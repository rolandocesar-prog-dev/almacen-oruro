// F-009 · Historia 4: respaldo de la base (FR-015 a FR-020, research O-08 a O-10).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ErrorDeNegocio } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import { FallaDelRespaldo, generarRespaldo, motivoDeLaFalla, type MotivoDeFalla } from "@/servicios/respaldo";

const CONTENEDOR = process.env.CONTENEDOR_BASE_DATOS ?? "almacen-oruro-postgres";

async function errorDe(promesa: Promise<unknown>) {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeNegocio);
  return error as ErrorDeNegocio;
}

function fallaCon(motivo: MotivoDeFalla) {
  return async () => {
    throw new FallaDelRespaldo(motivo, "detalle técnico que no se muestra");
  };
}

describe("generarRespaldo con un ejecutor simulado (sin Docker)", () => {
  it.each<[MotivoDeFalla, string]>([
    [
      "docker",
      "No se pudo generar el respaldo: Docker Desktop no está en funcionamiento. Ábrelo, espera a que diga que está listo e intenta nuevamente",
    ],
    ["contenedor", "No se pudo generar el respaldo: la base de datos no está en funcionamiento. Ejecuta «docker compose up -d» e intenta nuevamente"],
    ["demora", "El respaldo tardó demasiado y no se generó. Intenta nuevamente"],
    ["otra", "No se pudo generar el respaldo. Intenta nuevamente; si se repite, revisa la guía de instalación"],
  ])("la falla «%s» da su mensaje y ningún archivo (FR-020)", async (motivo, mensaje) => {
    expect((await errorDe(generarRespaldo(fallaCon(motivo)))).message).toBe(mensaje);
  });

  it("una salida vacía también es una falla: nunca se entrega un archivo vacío (FR-020)", async () => {
    expect((await errorDe(generarRespaldo(async () => "   "))).message).toBe(
      "No se pudo generar el respaldo. Intenta nuevamente; si se repite, revisa la guía de instalación",
    );
  });

  it("con éxito devuelve el nombre del archivo y el contenido tal cual, y pasa contenedor, usuario y base", async () => {
    const llamadas: string[][] = [];
    const respaldo = await generarRespaldo(async (contenedor, usuario, base) => {
      llamadas.push([contenedor, usuario, base]);
      return "-- respaldo de prueba\n";
    });

    expect(respaldo.nombreArchivo).toMatch(/^respaldo-almacen-oruro-\d{4}-\d{2}-\d{2}-\d{4}\.sql$/);
    expect(respaldo.contenido).toBe("-- respaldo de prueba\n");
    // Usuario y base salen de DATABASE_URL (en las pruebas, la base _test).
    const url = new URL(process.env.DATABASE_URL!);
    expect(llamadas).toEqual([[CONTENEDOR, decodeURIComponent(url.username), url.pathname.slice(1)]]);
  });
});

describe("motivoDeLaFalla: cómo se clasifica un error real de docker (research O-10)", () => {
  it.each<[string, Parameters<typeof motivoDeLaFalla>[0], MotivoDeFalla]>([
    ["docker no instalado", { code: "ENOENT" }, "docker"],
    ["Docker Desktop cerrado", { stderr: "error during connect: Cannot connect to the Docker daemon at npipe:////./pipe/docker_engine" }, "docker"],
    ["contenedor inexistente", { stderr: "Error response from daemon: No such container: almacen-oruro-postgres" }, "contenedor"],
    ["contenedor detenido", { stderr: "Error response from daemon: container abc is not running" }, "contenedor"],
    ["tiempo agotado", { killed: true, signal: "SIGTERM" }, "demora"],
    ["error de pg_dump", { code: 1, stderr: "pg_dump: error: connection to server failed" }, "otra"],
  ])("%s → %s", (_, error, motivo) => {
    expect(motivoDeLaFalla(error)).toBe(motivo);
  });
});

function hayContenedor(): boolean {
  try {
    return execFileSync("docker", ["inspect", "-f", "{{.State.Running}}", CONTENEDOR], { encoding: "utf8" }).trim() === "true";
  } catch {
    return false;
  }
}

describe("generarRespaldo real con pg_dump en el contenedor", () => {
  it.skipIf(!hayContenedor())("respalda todas las tablas del sistema y la de migraciones (FR-015, SC-004)", async () => {
    const tablas = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
    expect(tablas.length).toBeGreaterThanOrEqual(19);

    const { contenido } = await generarRespaldo();

    expect(contenido).toContain("PostgreSQL database dump");
    for (const { table_name } of tablas) expect(contenido).toContain(`COPY public.${table_name} `);
  });
});

describe("invariantes de seguridad del respaldo (constitución, principio VII; research O-08)", () => {
  const leer = (ruta: string) => readFileSync(path.join(process.cwd(), ruta), "utf8");
  const servicio = leer("src/servicios/respaldo.ts");

  it("la página y la acción exigen sesión como primera instrucción", () => {
    for (const ruta of ["src/app/(sistema)/respaldo/page.tsx", "src/app/(sistema)/respaldo/acciones.ts"]) {
      // La firma ocupa una línea que termina en "{"; el tipo de retorno puede tener llaves adentro.
      const cuerpo = leer(ruta).split(/export (?:default )?async function [^\n]*\{\n/)[1] ?? "";
      expect(cuerpo.trimStart().startsWith("await requerirSesion()"), ruta).toBe(true);
    }
  });

  it("el servicio ejecuta pg_dump con execFile y argumentos fijos, sin intérprete de comandos", () => {
    expect(servicio).toContain('execFile(\n      "docker",');
    expect(servicio).not.toMatch(/\bexec\(|execSync|spawn\(|shell:\s*true/);
  });

  it("no pasa la contraseña de la base ni escribe el respaldo en disco (FR-017)", () => {
    expect(servicio).not.toMatch(/PGPASSWORD|password/i);
    expect(servicio).not.toMatch(/writeFile|createWriteStream|node:fs/);
  });
});
