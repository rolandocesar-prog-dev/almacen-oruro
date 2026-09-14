import type { SelectHTMLAttributes } from "react";

export type OpcionSelector = { id: number; etiqueta: string };

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  etiqueta: string;
  opciones: OpcionSelector[];
  /** Texto de la opción vacía, por ejemplo "Elige una categoría". */
  textoVacio: string;
  ayuda?: string;
  errores?: string[];
};

/**
 * Selector accesible, con la misma forma que Campo: etiqueta asociada y errores anunciados con
 * aria-describedby. Un selector deshabilitado no envía su valor: quien lo deshabilite debe mandar
 * el valor en un campo oculto.
 */
export function Selector({ id, etiqueta, opciones, textoVacio, ayuda, errores, className = "", ...resto }: Props) {
  const tieneErrores = Boolean(errores && errores.length > 0);
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idErrores = tieneErrores ? `${id}-errores` : undefined;
  const descritoPor = [idAyuda, idErrores].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      <select
        id={id}
        name={resto.name ?? id}
        aria-invalid={tieneErrores}
        aria-describedby={descritoPor}
        className={`w-full min-w-0 rounded-md border bg-white px-3 py-2 text-base ${tieneErrores ? "border-error" : "border-borde"} ${className}`}
        {...resto}
      >
        <option value="">{textoVacio}</option>
        {opciones.map((opcion) => (
          <option key={opcion.id} value={opcion.id}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
      {ayuda && (
        <p id={idAyuda} className="text-xs text-gray-600">
          {ayuda}
        </p>
      )}
      {tieneErrores && (
        <ul id={idErrores} className="text-sm text-error">
          {errores!.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
