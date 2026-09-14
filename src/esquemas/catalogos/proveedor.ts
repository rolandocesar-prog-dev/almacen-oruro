// Esquema de proveedor: lo usan el formulario y la Server Action (principio VI, data-model §1).
import { z } from "zod";
import { telefonoOpcional, textoObligatorio, textoOpcional } from "../comunes";

const MENSAJE_CORREO = "Escribe un correo con el formato nombre@dominio.com";

export const esquemaProveedor = z.object({
  // No es única: dos proveedores pueden llamarse igual si tienen distinto NIT (FR-019).
  razonSocial: textoObligatorio("la razón social", "La razón social", 100),
  // El NIT identifica al proveedor y es único (RN-11). Solo dígitos, sin guiones ni puntos.
  nit: z
    .string()
    .trim()
    .min(1, { error: "Escribe el NIT", abort: true })
    .regex(/^[0-9]+$/, { error: "El NIT solo admite dígitos", abort: true })
    .max(20, { error: "El NIT admite hasta 20 dígitos" }),
  contactoNombre: textoOpcional("El nombre de contacto", 80),
  telefono: telefonoOpcional(),
  // Opcional; si se escribe, debe tener formato de correo. Se guarda en minúsculas.
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .max(100, { error: "El correo admite hasta 100 caracteres", abort: true })
    .refine((valor) => valor === "" || z.email().safeParse(valor).success, { error: MENSAJE_CORREO })
    .transform((valor) => (valor ? valor : undefined))
    .optional(),
  direccion: textoOpcional("La dirección", 150),
});

export type DatosProveedor = z.infer<typeof esquemaProveedor>;
