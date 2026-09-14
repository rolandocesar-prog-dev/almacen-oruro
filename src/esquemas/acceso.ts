// Esquemas de acceso: los usan el formulario (cliente) y la Server Action (servidor)
// para validar con las mismas reglas (constitución, principio VI).
import { z } from "zod";
import { esFechaValida, hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";

export const esquemaIngreso = z.object({
  // Se compara sin mayúsculas ni espacios en los extremos (FR-002).
  nombreUsuario: z.string().trim().toLowerCase().min(1, { error: "Escribe tu nombre de usuario" }),
  // La contraseña se compara exacta: no se recorta (FR-002).
  contrasena: z.string().min(1, { error: "Escribe tu contraseña" }),
});

export type DatosIngreso = z.infer<typeof esquemaIngreso>;

/** Un campo vacío del formulario (o ausente en la URL) se trata como "sin valor". */
const vacioComoAusente = (valor: unknown) => (valor === "" || valor === null ? undefined : valor);

function fecha(porDefecto: () => string) {
  return z.preprocess(
    vacioComoAusente,
    z.string().refine(esFechaValida, { error: "Usa una fecha válida" }).default(porDefecto),
  );
}

/** Filtros del historial de sesiones (FR-022). Por defecto, el mes en curso. */
export const esquemaFiltroSesiones = z
  .object({
    usuario: z.preprocess(vacioComoAusente, z.coerce.number().int().positive().optional()),
    desde: fecha(inicioDelMesEnCurso),
    hasta: fecha(hoyEnLaPaz),
    pagina: z.preprocess(vacioComoAusente, z.coerce.number().int().min(1).default(1)),
  })
  .refine((filtro) => filtro.desde <= filtro.hasta, {
    error: "La fecha «desde» no puede ser posterior a «hasta»",
    path: ["hasta"],
  });

export type FiltroSesiones = z.infer<typeof esquemaFiltroSesiones>;
