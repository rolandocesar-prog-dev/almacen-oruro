// Esquema de centro de salud: lo usan el formulario y la Server Action (principio VI, data-model §1).
import { z } from "zod";
import { telefonoOpcional, textoObligatorio, textoOpcional } from "../comunes";

export const esquemaCentroSalud = z.object({
  nombre: textoObligatorio("el nombre", "El nombre", 100),
  telefono: telefonoOpcional(),
  direccion: textoOpcional("La dirección", 150),
});

export type DatosCentroSalud = z.infer<typeof esquemaCentroSalud>;
