// Esquemas de producto: los usan el formulario, la Server Action y el listado (principio VI, data-model §1).
import { z } from "zod";
import { enteroNoNegativo, esquemaFiltroCatalogo, idObligatorio, textoObligatorio, textoOpcional, vacioComoAusente } from "../comunes";

// Solo letras A–Z sin Ñ ni tildes, dígitos y guion: el código se escribe en etiquetas y se busca
// igual en cualquier teclado (FR-012).
const REGLA_CODIGO = /^[A-Z0-9-]{1,20}$/;

export const esquemaProducto = z.object({
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, { error: "Escribe el código", abort: true })
    .regex(REGLA_CODIGO, { error: "Usa hasta 20 caracteres: letras sin Ñ ni tildes, dígitos y guion" }),
  nombre: textoObligatorio("el nombre", "El nombre", 80),
  descripcion: textoOpcional("La descripción", 200),
  categoriaId: idObligatorio("Elige una categoría"),
  unidadMedidaId: idObligatorio("Elige una unidad de medida"),
  stockMinimo: enteroNoNegativo("El stock mínimo debe ser un número entero mayor o igual a 0"),
  // No hay campo stockActual: Zod descarta las claves que no están en el esquema, así que un valor
  // enviado desde el formulario nunca llega al servicio. El stock solo cambia con el kardex (RN-15, principio III).
});

/** Filtros del listado de productos: búsqueda, estado y categoría. Una categoría inválida se ignora. */
export const esquemaFiltroProductos = esquemaFiltroCatalogo.extend({
  categoria: z.preprocess(vacioComoAusente, z.coerce.number().int().positive()).optional().catch(undefined),
});

export type DatosProducto = z.infer<typeof esquemaProducto>;
export type FiltroProductos = z.infer<typeof esquemaFiltroProductos>;
