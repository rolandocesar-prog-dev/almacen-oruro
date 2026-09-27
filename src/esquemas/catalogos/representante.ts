// Esquema de representante: lo usan el formulario y la Server Action (principio VI, data-model §1).
import { z } from "zod";
import { idObligatorio, telefonoOpcional, textoObligatorio } from "../comunes";

// Carnet de identidad boliviano: dígitos y, si tiene complemento, un guion y letras o dígitos (4567890-1B).
const REGLA_CI = /^[0-9]+(-[0-9A-Z]+)?$/;
const MENSAJE_CI = "Usa dígitos y, si tiene complemento, un guion: 4567890-1B";

// Sin "servicio": desde F-009 el representante se identifica por su nombre y su centro (D-22).
export const esquemaRepresentante = z.object({
  nombre: textoObligatorio("el nombre", "El nombre", 60),
  apellido: textoObligatorio("el apellido", "El apellido", 60),
  ci: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, { error: "Escribe el CI", abort: true })
    .max(15, { error: MENSAJE_CI, abort: true })
    .regex(REGLA_CI, { error: MENSAJE_CI }),
  telefono: telefonoOpcional(),
  centroSaludId: idObligatorio("Elige un centro de salud"),
});

export type DatosRepresentante = z.infer<typeof esquemaRepresentante>;
