// Esquema de unidad de medida: lo usan el formulario y la Server Action (principio VI, data-model §1).
import { z } from "zod";
import { textoObligatorio } from "../comunes";

export const esquemaUnidadMedida = z.object({
  nombre: textoObligatorio("el nombre", "El nombre", 40),
  // No es única: "U" puede abreviar "Unidad" y "Unidad suelta".
  abreviatura: textoObligatorio("la abreviatura", "La abreviatura", 10),
});

export type DatosUnidadMedida = z.infer<typeof esquemaUnidadMedida>;
