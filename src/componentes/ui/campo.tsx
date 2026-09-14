import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  etiqueta: string;
  ayuda?: string;
  errores?: string[];
};

/**
 * Campo de formulario accesible: la etiqueta está asociada al campo y los errores se anuncian
 * a los lectores de pantalla mediante aria-describedby y aria-invalid.
 */
export function Campo({ id, etiqueta, ayuda, errores, className = "", ...resto }: Props) {
  const tieneErrores = Boolean(errores && errores.length > 0);
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idErrores = tieneErrores ? `${id}-errores` : undefined;
  const descritoPor = [idAyuda, idErrores].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      <input
        id={id}
        name={resto.name ?? id}
        aria-invalid={tieneErrores}
        aria-describedby={descritoPor}
        className={`rounded-md border px-3 py-2 text-base ${tieneErrores ? "border-error" : "border-borde"} ${className}`}
        {...resto}
      />
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
