// Esquemas de pedidos: los usan el formulario de pedido y las Server Actions (principio VI,
// data-model §1). El estado y la cantidad entregada NO forman parte del esquema: el estado lo calcula el
// sistema a partir de lo entregado (RN-41) y lo entregado solo lo cambian las distribuciones (FR-009).
// Cualquier valor de esos campos que llegue del formulario se descarta.
import { z } from "zod";
import {
  cantidadEntera,
  fechaNoFutura,
  fechaOpcionalDeFiltro,
  idObligatorio,
  marcarProductosRepetidos,
  textoObligatorio,
  textoOpcional,
  vacioComoAusente,
} from "./comunes";

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

/** Opciones del filtro de estado del listado (FR-013, research P-07). "por-atender" = PENDIENTE y PARCIAL. */
export const ESTADOS_FILTRO_PEDIDOS = ["por-atender", "pendientes", "parciales", "atendidos", "anulados", "todos"] as const;
export type EstadoFiltroPedidos = (typeof ESTADOS_FILTRO_PEDIDOS)[number];

/**
 * Filtros del listado de pedidos (FR-013, data-model §4). Por defecto, los que tienen algo por entregar,
 * sin rango de fechas: un pedido por atender puede ser antiguo. Un valor inválido en la URL toma el valor
 * por defecto en lugar de romper la página.
 */
export const esquemaFiltroPedidos = z
  .object({
    estado: z.enum(ESTADOS_FILTRO_PEDIDOS).catch("por-atender"),
    representante: z.preprocess(vacioComoAusente, z.coerce.number().int().positive()).optional().catch(undefined),
    desde: fechaOpcionalDeFiltro(),
    hasta: fechaOpcionalDeFiltro(),
    pagina: z.preprocess(vacioComoAusente, z.coerce.number().int().min(1).default(1)).catch(1),
  })
  .refine((filtro) => !filtro.desde || !filtro.hasta || filtro.desde <= filtro.hasta, {
    error: "La fecha «desde» no puede ser posterior a «hasta»",
    path: ["hasta"],
  });

export type FiltroPedidos = z.infer<typeof esquemaFiltroPedidos>;

/** Anular un pedido exige el motivo (RN-43, FR-010). */
export const esquemaAnulacionPedido = z.object({
  motivo: textoObligatorio("el motivo de la anulación", "El motivo", 200),
});
