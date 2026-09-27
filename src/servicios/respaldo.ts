// Respaldo de la base de datos (F-009, Historia 4). Detalle y fundamentos: research O-08 a O-10.
//
// El respaldo lo genera pg_dump, la herramienta oficial de PostgreSQL, que ya viene dentro del
// contenedor de la base (D-17). Se ejecuta con execFile y argumentos fijos: no pasa por un intérprete
// de comandos, así que ningún texto puede convertirse en una orden. No se escribe nada en disco: el
// archivo va directo al navegador del encargado, que lo guarda donde corresponda (FR-017).
// La restauración NO se ofrece desde el sistema: está en la guía de instalación (FR-022, D-24).
import { execFile } from "node:child_process";
import { ErrorDeNegocio } from "@/lib/errores";
import { fechaEnLaPaz, horaEnLaPaz } from "@/lib/fechas";

/** Qué salió mal al ejecutar pg_dump: los dos primeros los puede resolver el encargado solo. */
export type MotivoDeFalla = "docker" | "contenedor" | "demora" | "otra";

const MENSAJES: Record<MotivoDeFalla, string> = {
  docker:
    "No se pudo generar el respaldo: Docker Desktop no está en funcionamiento. Ábrelo, espera a que diga que está listo e intenta nuevamente",
  contenedor: "No se pudo generar el respaldo: la base de datos no está en funcionamiento. Ejecuta «docker compose up -d» e intenta nuevamente",
  demora: "El respaldo tardó demasiado y no se generó. Intenta nuevamente",
  otra: "No se pudo generar el respaldo. Intenta nuevamente; si se repite, revisa la guía de instalación",
};

/** Falla de pg_dump ya clasificada. El detalle técnico va al registro del servidor, nunca a la pantalla. */
export class FallaDelRespaldo extends Error {
  readonly motivo: MotivoDeFalla;
  readonly detalle: string;

  constructor(motivo: MotivoDeFalla, detalle: string) {
    super(`Falla del respaldo (${motivo})`);
    this.name = "FallaDelRespaldo";
    this.motivo = motivo;
    this.detalle = detalle;
  }
}

/**
 * Clasifica el error de docker o de pg_dump por lo que informa (research O-10). El orden importa:
 * "Cannot connect to the Docker daemon" también contiene "is not running" en algunas versiones.
 */
export function motivoDeLaFalla(error: { code?: string | number | null; killed?: boolean; signal?: string | null; stderr?: string }): MotivoDeFalla {
  const mensaje = error.stderr ?? "";
  // execFile termina el proceso al vencer el tiempo máximo y lo marca como "killed".
  if (error.killed) return "demora";
  // ENOENT: el comando docker no existe en el equipo.
  if (error.code === "ENOENT" || /Cannot connect to the Docker daemon|error during connect|docker daemon is not running/i.test(mensaje)) {
    return "docker";
  }
  if (/No such container|is not running/i.test(mensaje)) return "contenedor";
  return "otra";
}

/** Quien ejecuta pg_dump. Se recibe como parámetro para poder probar los errores sin Docker (O-14). */
export type EjecutarPgDump = (contenedor: string, usuario: string, base: string) => Promise<string>;

// El valor por defecto de execFile (1 MB) se quedaría corto en cuanto crezcan los datos; la demostración
// de 36 meses ocupa unos 0,5 MB (medido el 26/09).
const LIMITE_DE_SALIDA = 200 * 1024 * 1024;
const TIEMPO_MAXIMO_MS = 60_000;

/**
 * Ejecuta pg_dump dentro del contenedor y devuelve el SQL.
 * - Formato SQL plano: se abre con el Bloc de notas y se restaura con psql (research O-12).
 * - --no-owner y --no-privileges: el archivo se restaura aunque el usuario de la base sea otro.
 * - Sin contraseña: dentro del contenedor las conexiones locales son de confianza.
 * - FR-016: pg_dump lee toda la base dentro de una sola transacción con una instantánea, así que un
 *   documento que se guarda mientras tanto queda completo o no queda. No hace falta bloquear nada.
 */
export const ejecutarPgDump: EjecutarPgDump = (contenedor, usuario, base) =>
  new Promise((resolver, rechazar) => {
    execFile(
      "docker",
      ["exec", contenedor, "pg_dump", "-U", usuario, "-d", base, "--no-owner", "--no-privileges"],
      { encoding: "utf8", maxBuffer: LIMITE_DE_SALIDA, timeout: TIEMPO_MAXIMO_MS, windowsHide: true },
      (error, salida, errores) => {
        if (error) {
          const motivo = motivoDeLaFalla({ code: error.code, killed: error.killed, signal: error.signal, stderr: errores });
          rechazar(new FallaDelRespaldo(motivo, errores || error.message));
          return;
        }
        resolver(salida);
      },
    );
  });

/** Usuario y base de datos de la cadena de conexión: son los mismos con que trabaja el sistema. */
function datosDeConexion(): { usuario: string; base: string } {
  const url = new URL(process.env.DATABASE_URL ?? "");
  return { usuario: decodeURIComponent(url.username), base: url.pathname.slice(1) };
}

/** "respaldo-almacen-oruro-2026-09-26-0715.sql": fecha y hora de Oruro (FR-017, research O-10). */
export function nombreArchivoRespaldo(momento: Date): string {
  return `respaldo-almacen-oruro-${fechaEnLaPaz(momento)}-${horaEnLaPaz(momento)}.sql`;
}

/**
 * Genera el respaldo de todos los datos de la base (FR-015). Solo entrega el archivo si pg_dump terminó
 * bien y devolvió algo: nunca un archivo cortado o vacío que parezca bueno (FR-020).
 */
export async function generarRespaldo(ejecutar: EjecutarPgDump = ejecutarPgDump): Promise<{ nombreArchivo: string; contenido: string }> {
  const contenedor = process.env.CONTENEDOR_BASE_DATOS ?? "almacen-oruro-postgres";
  let contenido: string;
  try {
    const { usuario, base } = datosDeConexion();
    contenido = await ejecutar(contenedor, usuario, base);
  } catch (error) {
    const motivo = error instanceof FallaDelRespaldo ? error.motivo : "otra";
    console.error("No se pudo generar el respaldo:", error instanceof FallaDelRespaldo ? error.detalle : error);
    throw new ErrorDeNegocio(MENSAJES[motivo]);
  }

  if (contenido.trim() === "") {
    console.error("No se pudo generar el respaldo: pg_dump terminó sin error pero no devolvió nada");
    throw new ErrorDeNegocio(MENSAJES.otra);
  }
  return { nombreArchivo: nombreArchivoRespaldo(new Date()), contenido };
}
