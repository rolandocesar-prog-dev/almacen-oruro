// Piezas de validación que comparten el personal (F-001), los catálogos (F-002) y las compras (F-003).
// Cada esquema de formulario las combina con sus propios límites (constitución, principio VI).
import { z } from "zod";
import { esFechaValida, hoyEnLaPaz } from "@/lib/fechas";

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
export function vacioComoAusente(valor: unknown) {
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
 * ¿El texto (ya con punto decimal) es un monto mayor que 0 con hasta 2 decimales y hasta 10 dígitos
 * enteros? Es el máximo que admite una columna decimal(12,2) de la base.
 */
export function esMontoPositivo(texto: string): boolean {
  return /^\d{1,10}(\.\d{1,2})?$/.test(texto) && Number(texto) > 0;
}

/**
 * Monto obligatorio escrito con coma o punto ("12,50" o "12.50"). Devuelve el texto con punto
 * ("12.50") para que el servidor lo guarde como decimal exacto, sin redondeos de coma flotante
 * (research C-08 y K-04).
 */
export function montoPositivo(mensaje: string) {
  return z
    .string({ error: mensaje })
    .trim()
    .transform((valor) => valor.replace(",", "."))
    .refine(esMontoPositivo, { error: mensaje });
}

/**
 * Fecha de un documento (AAAA-MM-DD) que no puede ser posterior a hoy. "Hoy" se calcula en La Paz:
 * a las 21:30 en Oruro ya es el día siguiente en UTC, y la fecha de hoy no debe verse como futura
 * (research R-12 y K-06).
 */
export function fechaNoFutura(mensajeFutura: string) {
  return z
    .string({ error: "Escribe una fecha válida" })
    .trim()
    .refine(esFechaValida, { error: "Escribe una fecha válida", abort: true })
    .refine((fecha) => fecha <= hoyEnLaPaz(), { error: mensajeFutura });
}

/** Un parámetro de fecha vacío o nulo en la URL se trata como "sin valor". */
function fechaAusente(valor: unknown) {
  return valor === "" || valor === null ? undefined : valor;
}

/** Fecha de un filtro por URL (AAAA-MM-DD). Vacía o ausente toma el valor por defecto. */
export function fechaDeFiltro(porDefecto: () => string) {
  return z.preprocess(fechaAusente, z.string().refine(esFechaValida, { error: "Usa una fecha válida" }).default(porDefecto));
}

/** Fecha de un filtro por URL sin valor por defecto: vacía o ausente queda sin valor (un kardex sin rango). */
export function fechaOpcionalDeFiltro() {
  return z.preprocess(fechaAusente, z.string().refine(esFechaValida, { error: "Usa una fecha válida" }).optional());
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

/** Aviso de la ficha después de registrar o modificar (?aviso=registrado). Otro valor se ignora. */
export const esquemaAvisoFicha = z.object({
  aviso: z.enum(["registrado", "modificado"]).optional().catch(undefined),
});
export type EstadoFiltro = FiltroCatalogo["estado"];

/** Condición de Prisma para el filtro de estado: `undefined` trae activos e inactivos. */
export function condicionDeEstado(estado: EstadoFiltro): boolean | undefined {
  return estado === "todos" ? undefined : estado === "activos";
}
