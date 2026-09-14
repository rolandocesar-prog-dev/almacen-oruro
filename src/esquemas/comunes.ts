// Piezas de validación que comparten el personal (F-001) y los catálogos (F-002).
// Cada esquema de formulario las combina con sus propios límites (constitución, principio VI).
import { z } from "zod";

/** Texto obligatorio: se recortan los extremos y se exige entre 1 y `maximo` caracteres. */
export function textoObligatorio(queFalta: string, campo: string, maximo: number) {
  return z
    .string()
    .trim()
    .min(1, { error: `Escribe ${queFalta}`, abort: true })
    .max(maximo, { error: `${campo} admite hasta ${maximo} caracteres` });
}

/** Texto opcional: un campo vacío se guarda como "sin dato". */
export function textoOpcional(campo: string, maximo: number) {
  return z
    .string()
    .trim()
    .max(maximo, { error: `${campo} admite hasta ${maximo} caracteres` })
    .transform((valor) => (valor ? valor : undefined))
    .optional();
}

/** Teléfono opcional: hasta 20 caracteres entre dígitos, espacios, + y -. */
export function telefonoOpcional() {
  return z
    .string()
    .trim()
    .max(20, { error: "El teléfono admite hasta 20 caracteres" })
    .regex(/^[0-9 +-]*$/, { error: "El teléfono solo admite dígitos, espacios, + y -" })
    .transform((valor) => (valor ? valor : undefined))
    .optional();
}

/**
 * Un campo vacío de un formulario llega como "". Se convierte en "sin valor" antes de pasar a número:
 * si no, Number("") daría 0 y un stock mínimo o un selector vacíos pasarían como válidos.
 */
function vacioComoAusente(valor: unknown) {
  return typeof valor === "string" && valor.trim() === "" ? undefined : valor;
}

/** Número entero mayor o igual a 0, obligatorio, con un único mensaje para cualquier error. */
export function enteroNoNegativo(mensaje: string) {
  return z.preprocess(
    vacioComoAusente,
    z.coerce.number({ error: mensaje }).int({ error: mensaje }).min(0, { error: mensaje }),
  );
}

/** Id elegido en un selector (categoría, unidad, centro de salud…): obligatorio. */
export function idObligatorio(mensaje: string) {
  return z.preprocess(
    vacioComoAusente,
    z.coerce.number({ error: mensaje }).int({ error: mensaje }).positive({ error: mensaje }),
  );
}

/**
 * Filtros comunes de los listados: búsqueda y estado. Un estado inválido en la URL toma el valor
 * por defecto en lugar de romper la página.
 */
export const esquemaFiltroCatalogo = z.object({
  q: z.string().trim().max(60, { error: "La búsqueda admite hasta 60 caracteres" }).optional(),
  estado: z.enum(["activos", "inactivos", "todos"]).catch("activos"),
});

export type FiltroCatalogo = z.infer<typeof esquemaFiltroCatalogo>;
export type EstadoFiltro = FiltroCatalogo["estado"];

/** Condición de Prisma para el filtro de estado: `undefined` trae activos e inactivos. */
export function condicionDeEstado(estado: EstadoFiltro): boolean | undefined {
  return estado === "todos" ? undefined : estado === "activos";
}
