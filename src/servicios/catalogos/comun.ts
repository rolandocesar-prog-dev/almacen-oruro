// Mensajes que comparten los siete catálogos (F-002, research C-03 y C-04).
// Solo textos: cada regla de negocio vive en el archivo de su catálogo.
import { ErrorDeNegocio } from "@/lib/errores";

type OpcionesDuplicado = {
  /** "una" para categoría o unidad de medida; "un" para producto, proveedor, centro o representante. */
  articulo: "un" | "una";
  catalogo: string;
  /** ¿El registro que ya tiene ese valor está inactivo? */
  inactivo: boolean;
  campo: string;
  /** Valor guardado del registro existente, tal como se muestra (data-model §2). */
  valor: string;
};

/** "Ya existe una categoría [inactiva] con el nombre 'Desinfectantes'" (RN-11, data-model §2). */
export function mensajeDuplicado({ articulo, catalogo, inactivo, campo, valor }: OpcionesDuplicado): string {
  const estado = inactivo ? (articulo === "una" ? " inactiva" : " inactivo") : "";
  return `Ya existe ${articulo} ${catalogo}${estado} con el ${campo} '${valor}'`;
}

/**
 * Error de duplicado listo para lanzar. Si el registro existente está inactivo, agrega el enlace
 * "Ver y reactivar" a su ficha: en lugar de registrar otro igual, se reactiva el que ya existe
 * (research C-04). No se reactiva nada automáticamente: se decide en la ficha, viendo sus datos.
 */
export function errorDuplicado(opciones: OpcionesDuplicado & { ruta: string; campoFormulario: string }): ErrorDeNegocio {
  const enlace = opciones.inactivo ? { texto: "Ver y reactivar", ruta: opciones.ruta } : undefined;
  return new ErrorDeNegocio(mensajeDuplicado(opciones), opciones.campoFormulario, enlace);
}

/** "1 producto activo usa" o "4 productos activos usan": la cantidad con la forma que corresponde. */
export function pluralizar(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}
