// Esquemas de pedidos: los usan el formulario de pedido y las Server Actions (principio VI,
// data-model §1). El estado y la cantidad entregada NO forman parte del esquema: el estado lo calcula el
// sistema a partir de lo entregado (RN-41) y lo entregado solo lo cambian las distribuciones (FR-009).
// Cualquier valor de esos campos que llegue del formulario se descarta.
import { z } from "zod";
import { cantidadEntera, fechaNoFutura, idObligatorio, marcarProductosRepetidos, textoOpcional } from "./comunes";

export const esquemaLineaPedido = z.object({
  productoId: idObligatorio("Elige un producto"),
  // Mismo tope que las compras (FR-001). Se puede pedir más de lo que hay: el pedido registra la
  // necesidad y el stock se resuelve al distribuir (FR-005).
  cantidadSolicitada: cantidadEntera("La cantidad debe ser un número entero entre 1 y 1.000.000"),
});

export const esquemaPedido = z
  .object({
    representanteId: idObligatorio("Elige un representante"),
    fecha: fechaNoFutura("La fecha del pedido no puede ser futura"),
    observacion: textoOpcional("La observación", 200),
    lineas: z.array(esquemaLineaPedido).min(1, { error: "Agrega al menos un producto" }),
  })
  .superRefine((pedido, contexto) => {
    // RN-40: un producto va una sola vez por pedido; si se necesita más, se cambia su cantidad.
    marcarProductosRepetidos(pedido.lineas, contexto);
  });

export type DatosPedido = z.infer<typeof esquemaPedido>;
export type DatosLineaPedido = z.infer<typeof esquemaLineaPedido>;
