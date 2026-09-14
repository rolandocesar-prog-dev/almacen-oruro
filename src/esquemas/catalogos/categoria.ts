// Esquema de categoría: lo usan el formulario y la Server Action (principio VI, data-model §1).
import { z } from "zod";
import { textoObligatorio, textoOpcional } from "../comunes";

export const esquemaCategoria = z.object({
  nombre: textoObligatorio("el nombre", "El nombre", 60),
  descripcion: textoOpcional("La descripción", 200),
});

export type DatosCategoria = z.infer<typeof esquemaCategoria>;
