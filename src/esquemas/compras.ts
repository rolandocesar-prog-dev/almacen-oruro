// Esquemas de compras: los usan el formulario de compra y las Server Actions (principio VI,
// data-model §1). Los montos (subtotal, total) NO forman parte del esquema: los calcula el servidor
// y cualquier valor que llegue del formulario se descarta (RN-23, defecto X-14).
import { z } from "zod";
import { aCentavos } from "@/lib/dinero";
import { fechaNoFutura, idObligatorio, montoPositivo, textoObligatorio, textoOpcional, vacioComoAusente } from "./comunes";

const MENSAJE_CANTIDAD = "La cantidad debe ser un número entero entre 1 y 1.000.000";
const MENSAJE_FACTURA = "El Nº de factura solo admite dígitos, hasta 20";

/** Máximo que admite la columna decimal(12,2) del total: 9 999 999 999,99, en centavos. */
const TOTAL_MAXIMO_CENTAVOS = 999_999_999_999;

/** Nº de factura tal como está impreso: solo dígitos, así que "0001234" y "1234" son distintos. */
const nroFactura = z
  .string({ error: "Escribe el Nº de factura" })
  .trim()
  .min(1, { error: "Escribe el Nº de factura", abort: true })
  .regex(/^[0-9]{1,20}$/, { error: MENSAJE_FACTURA });

export const esquemaLineaCompra = z.object({
  productoId: idObligatorio("Elige un producto"),
  // El tope de 1 000 000 evita que el stock desborde su columna entera (spec, casos borde).
  cantidad: z.preprocess(
    vacioComoAusente,
    z.coerce
      .number({ error: MENSAJE_CANTIDAD })
      .int({ error: MENSAJE_CANTIDAD })
      .min(1, { error: MENSAJE_CANTIDAD })
      .max(1_000_000, { error: MENSAJE_CANTIDAD }),
  ),
  precioUnitario: montoPositivo("Escribe un precio mayor que 0 con hasta 2 decimales"),
});

export const esquemaCompra = z
  .object({
    proveedorId: idObligatorio("Elige un proveedor"),
    nroFactura,
    fecha: fechaNoFutura("La fecha de la compra no puede ser futura"),
    observacion: textoOpcional("La observación", 200),
    lineas: z.array(esquemaLineaCompra).min(1, { error: "Agrega al menos un producto" }),
  })
  .superRefine((compra, contexto) => {
    // RN-22: un producto no se repite. Se indica la línea repetida y la primera, para que se sepa
    // cuál corregir sin buscar en la tabla.
    const primeraLineaDe = new Map<number, number>();
    compra.lineas.forEach((linea, indice) => {
      const anterior = primeraLineaDe.get(linea.productoId);
      if (anterior === undefined) {
        primeraLineaDe.set(linea.productoId, indice);
        return;
      }
      contexto.addIssue({
        code: "custom",
        path: ["lineas", indice, "productoId"],
        message: `Línea ${indice + 1}: el producto ya está en la línea ${anterior + 1}; modifica su cantidad`,
      });
    });

    // El total se controla en centavos enteros, sin coma flotante. El servidor lo vuelve a calcular
    // con Prisma.Decimal al guardar.
    const totalCentavos = compra.lineas.reduce((suma, linea) => suma + linea.cantidad * (aCentavos(linea.precioUnitario) ?? 0), 0);
    if (totalCentavos > TOTAL_MAXIMO_CENTAVOS) {
      contexto.addIssue({ code: "custom", path: ["lineas"], message: "El total de la compra no puede superar Bs 9.999.999.999,99" });
    }
  });

/** Datos para avisar, al salir del campo, si la factura ya está registrada para ese proveedor (RN-21). */
export const esquemaVerificacionFactura = z.object({
  proveedorId: idObligatorio("Elige un proveedor"),
  nroFactura,
});

/** Aviso de la ficha después de registrar (?aviso=registrada). Otro valor se ignora. */
export const esquemaAvisoCompra = z.object({
  aviso: z.enum(["registrada"]).optional().catch(undefined),
});

/** Anular una compra exige el motivo (RN-25). */
export const esquemaAnulacion = z.object({
  motivo: textoObligatorio("el motivo de la anulación", "El motivo", 200),
});

export type DatosCompra = z.infer<typeof esquemaCompra>;
export type DatosLineaCompra = z.infer<typeof esquemaLineaCompra>;
