// Esquemas de distribuciones: los usan el formulario de distribución y las Server Actions (principio VI,
// data-model §1). El estado, el usuario y el representante NO forman parte del esquema: la distribución
// nace REGISTRADA, el usuario es el de la sesión y el representante sale del pedido, sin guardarse aparte
// (X-08). Lo que depende del pedido y del stock (pendiente, máximo, fecha del pedido) lo verifica el
// servicio con los datos bloqueados (research V-03).
import { z } from "zod";
import { cantidadEntera, fechaNoFutura, idObligatorio, textoOpcional, vacioComoAusente } from "./comunes";

const MENSAJE_CANTIDAD = "La cantidad debe ser un número entero entre 1 y 1.000.000";

/**
 * Nº de vale tal como está impreso en el talonario: solo dígitos, así que "0500" y "500" son vales
 * distintos (caso borde) y no se quitan los ceros a la izquierda.
 */
const nroVale = z
  .string({ error: "Escribe el Nº de vale" })
  .trim()
  .min(1, { error: "Escribe el Nº de vale", abort: true })
  .regex(/^[0-9]{1,20}$/, { error: "El Nº de vale solo admite dígitos, hasta 20" });

export const esquemaLineaDistribucion = z.object({
  pedidoDetalleId: idObligatorio("Elige una línea del pedido"),
  // RN-33: una línea vacía no se entrega; si trae algo, es una cantidad entera válida.
  cantidad: z.preprocess(vacioComoAusente, cantidadEntera(MENSAJE_CANTIDAD).optional()),
});

export const esquemaDistribucion = z
  .object({
    pedidoId: idObligatorio("Elige un pedido"),
    nroVale,
    fecha: fechaNoFutura("La fecha de la distribución no puede ser futura"),
    observacion: textoOpcional("La observación", 200),
    // Una entrada por fila del formulario, aunque esté vacía: así el índice de cada error coincide con la
    // fila en pantalla (research V-02).
    lineas: z.array(esquemaLineaDistribucion),
  })
  .superRefine((distribucion, contexto) => {
    // RN-33: se puede entregar parte del pedido, pero al menos un producto.
    if (!distribucion.lineas.some((linea) => linea.cantidad !== undefined)) {
      contexto.addIssue({ code: "custom", path: ["lineas"], message: "Entrega al menos un producto: escribe la cantidad en una línea" });
    }

    // FR-003: una línea del pedido va una sola vez. Si se repitiera, cada cantidad podría pasar el máximo
    // por separado y la base las rechazaría juntas con un error que no dice qué corregir.
    const primeraFilaDe = new Map<number, number>();
    distribucion.lineas.forEach((linea, indice) => {
      const anterior = primeraFilaDe.get(linea.pedidoDetalleId);
      if (anterior === undefined) {
        primeraFilaDe.set(linea.pedidoDetalleId, indice);
        return;
      }
      contexto.addIssue({
        code: "custom",
        path: ["lineas", indice, "pedidoDetalleId"],
        message: `Línea ${indice + 1}: esa línea del pedido ya está en la línea ${anterior + 1}`,
      });
    });
  });

/** Datos para avisar, al salir del campo, si el vale ya está en una distribución vigente (RN-31). */
export const esquemaVerificacionVale = z.object({ nroVale });

/** Aviso de la ficha después de registrar (?aviso=registrada). Otro valor se ignora. */
export const esquemaAvisoDistribucion = z.object({
  aviso: z.enum(["registrada"]).optional().catch(undefined),
});

/**
 * Pedido elegido para distribuir (?pedido=15) o página de la lista para elegirlo. Un valor inválido se trata
 * como "sin elegir" o como la primera página.
 */
export const esquemaPedidoParaDistribuir = z.object({
  pedido: z.preprocess(vacioComoAusente, z.coerce.number().int().positive()).optional().catch(undefined),
  pagina: z.preprocess(vacioComoAusente, z.coerce.number().int().min(1).default(1)).catch(1),
});

export type DatosDistribucion = z.infer<typeof esquemaDistribucion>;
export type DatosLineaDistribucion = z.infer<typeof esquemaLineaDistribucion>;
