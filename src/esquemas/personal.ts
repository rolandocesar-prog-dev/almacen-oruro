// Esquemas del personal: los usan los formularios (cliente) y las Server Actions (servidor)
// con las mismas reglas (constitución, principio VI). Límites de data-model.md §5.1.
import { z } from "zod";

/** Texto obligatorio: se recortan los extremos y se exige entre 1 y `maximo` caracteres. */
function textoObligatorio(queFalta: string, campo: string, maximo: number) {
  return z
    .string()
    .trim()
    .min(1, { error: `Escribe ${queFalta}`, abort: true })
    .max(maximo, { error: `${campo} admite hasta ${maximo} caracteres` });
}

/** Texto opcional: un campo vacío se guarda como "sin dato". */
function textoOpcional(campo: string, maximo: number) {
  return z
    .string()
    .trim()
    .max(maximo, { error: `${campo} admite hasta ${maximo} caracteres` })
    .transform((valor) => (valor ? valor : undefined))
    .optional();
}

const REGLA_NOMBRE_USUARIO = /^[a-z0-9._]{3,30}$/;

export const esquemaDatosPersonales = z.object({
  nombre: textoObligatorio("el nombre", "El nombre", 60),
  apellido: textoObligatorio("el apellido", "El apellido", 60),
  cargo: textoObligatorio("el cargo", "El cargo", 60),
  direccion: textoOpcional("La dirección", 150),
  telefono: z
    .string()
    .trim()
    .max(20, { error: "El teléfono admite hasta 20 caracteres" })
    .regex(/^[0-9 +-]*$/, { error: "El teléfono solo admite dígitos, espacios, + y -" })
    .transform((valor) => (valor ? valor : undefined))
    .optional(),
  // Se guarda en minúsculas y sin espacios en los extremos: la unicidad no distingue mayúsculas (FR-011).
  nombreUsuario: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: "Escribe el nombre de usuario", abort: true })
    .regex(REGLA_NOMBRE_USUARIO, {
      error: "Usa de 3 a 30 caracteres: letras minúsculas sin tildes, dígitos, punto o guion bajo",
    }),
});

/**
 * Contraseña nueva: al menos 8 caracteres (RN-02). No se recorta: los espacios cuentan.
 * El máximo de 72 lo impone bcrypt, que ignora lo que pasa de 72 bytes.
 */
export const reglaContrasenaNueva = z
  .string()
  .min(8, { error: "La contraseña debe tener al menos 8 caracteres" })
  .max(72, { error: "La contraseña admite hasta 72 caracteres" });

export const esquemaRegistroPersonal = esquemaDatosPersonales
  .extend({
    contrasena: reglaContrasenaNueva,
    confirmacion: z.string(),
  })
  .refine((datos) => datos.contrasena === datos.confirmacion, {
    error: "Las contraseñas no coinciden",
    path: ["confirmacion"],
  });

/** Cambiar la propia contraseña, también en el cambio obligatorio (FR-019, FR-021). */
export const esquemaCambioContrasena = z
  .object({
    contrasenaActual: z.string().min(1, { error: "Escribe tu contraseña actual" }),
    contrasenaNueva: reglaContrasenaNueva,
    confirmacion: z.string(),
  })
  .refine((datos) => datos.contrasenaNueva === datos.confirmacion, {
    error: "Las contraseñas no coinciden",
    path: ["confirmacion"],
  });

/** Restablecer la contraseña de otra persona con una temporal que escribe el encargado (FR-020). */
export const esquemaRestablecimiento = z
  .object({
    contrasenaTemporal: reglaContrasenaNueva,
    confirmacion: z.string(),
  })
  .refine((datos) => datos.contrasenaTemporal === datos.confirmacion, {
    error: "Las contraseñas no coinciden",
    path: ["confirmacion"],
  });

/** Filtros del listado de personal. Un valor inválido en la URL toma el valor por defecto. */
export const esquemaFiltroPersonal = z.object({
  q: z.string().trim().max(60, { error: "La búsqueda admite hasta 60 caracteres" }).optional(),
  estado: z.enum(["activos", "inactivos", "todos"]).catch("activos"),
});

export type DatosPersonales = z.infer<typeof esquemaDatosPersonales>;
export type DatosRegistroPersonal = z.infer<typeof esquemaRegistroPersonal>;
export type FiltroPersonal = z.infer<typeof esquemaFiltroPersonal>;
