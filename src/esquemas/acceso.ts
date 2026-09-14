// Esquemas de acceso: los usan el formulario (cliente) y la Server Action (servidor)
// para validar con las mismas reglas (constitución, principio VI).
import { z } from "zod";

export const esquemaIngreso = z.object({
  // Se compara sin mayúsculas ni espacios en los extremos (FR-002).
  nombreUsuario: z.string().trim().toLowerCase().min(1, { error: "Escribe tu nombre de usuario" }),
  // La contraseña se compara exacta: no se recorta (FR-002).
  contrasena: z.string().min(1, { error: "Escribe tu contraseña" }),
});

export type DatosIngreso = z.infer<typeof esquemaIngreso>;
