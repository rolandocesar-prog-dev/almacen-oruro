// Esquemas de los productos que ofrece un proveedor (Historia 6, research C-08).
import { z } from "zod";
import { idObligatorio } from "../comunes";

const MENSAJE_PRECIO = "Escribe un precio mayor que 0 con hasta 2 decimales";

/**
 * Precio referencial opcional. Se escribe con coma o con punto ("12,50" o "12.50") y llega como
 * texto con punto ("12.50"): así el servicio lo guarda como decimal exacto, sin pasar por un número
 * de coma flotante que podría redondearlo. Hasta 10 dígitos enteros, como decimal(12,2) de la base.
 */
export const esquemaPrecioReferencial = z
  .string()
  .trim()
  .transform((valor) => valor.replace(",", "."))
  .refine((valor) => valor === "" || (/^\d{1,10}(\.\d{1,2})?$/.test(valor) && Number(valor) > 0), { error: MENSAJE_PRECIO })
  .transform((valor) => (valor ? valor : undefined))
  .optional();

/** Agregar un producto a la lista de un proveedor. */
export const esquemaProveedorProducto = z.object({
  productoId: idObligatorio("Elige un producto"),
  precioReferencial: esquemaPrecioReferencial,
});

/** Cambiar el precio de un producto ya asociado (vacío lo deja sin precio). */
export const esquemaCambioPrecio = z.object({
  precioReferencial: esquemaPrecioReferencial,
});

/** Qué asociaciones muestra la ficha del proveedor. Un valor inválido en la URL muestra las activas. */
export const esquemaFiltroAsociaciones = z.object({
  asociaciones: z.enum(["activas", "inactivas"]).catch("activas"),
});

export type DatosProveedorProducto = z.infer<typeof esquemaProveedorProducto>;
export type FiltroAsociaciones = z.infer<typeof esquemaFiltroAsociaciones>;
