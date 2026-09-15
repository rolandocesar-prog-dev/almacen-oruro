// Esquemas de compras: los usan el formulario de compra y las Server Actions (principio VI,
// data-model §1). Los montos (subtotal, total) NO forman parte del esquema: los calcula el servidor
// y cualquier valor que llegue del formulario se descarta (RN-23, defecto X-14).
import { z } from "zod";
import { aCentavos } from "@/lib/dinero";
import { hoyEnLaPaz, inicioDelMesEnCurso } from "@/lib/fechas";
import {
  cantidadEntera,
  fechaDeFiltro,
  fechaNoFutura,
  idObligatorio,
  marcarProductosRepetidos,
  montoPositivo,
  textoObligatorio,
  textoOpcional,
  vacioComoAusente,
} from "./comunes";

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
  cantidad: cantidadEntera(MENSAJE_CANTIDAD),
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
    // RN-22: un producto no se repite en la compra.
    marcarProductosRepetidos(compra.lineas, contexto);

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

/**
 * Filtros del listado de compras (FR-008, research K-09). Por defecto, el mes en curso hasta hoy.
 * `factura` busca los números que empiezan con lo escrito.
 */
export const esquemaFiltroCompras = z
  .object({
    desde: fechaDeFiltro(inicioDelMesEnCurso),
    hasta: fechaDeFiltro(hoyEnLaPaz),
    proveedor: z.preprocess(vacioComoAusente, z.coerce.number().int().positive()).optional().catch(undefined),
    estado: z.enum(["todas", "registradas", "anuladas"]).catch("todas"),
    factura: z
      .string()
      .trim()
      .regex(/^[0-9]{0,20}$/, { error: "El Nº de factura solo admite dígitos" })
      .transform((valor) => (valor ? valor : undefined))
      .optional(),
    pagina: z.preprocess(vacioComoAusente, z.coerce.number().int().min(1).default(1)).catch(1),
  })
  .refine((filtro) => filtro.desde <= filtro.hasta, {
    error: "La fecha «desde» no puede ser posterior a «hasta»",
    path: ["hasta"],
  });

export type FiltroCompras = z.infer<typeof esquemaFiltroCompras>;

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
