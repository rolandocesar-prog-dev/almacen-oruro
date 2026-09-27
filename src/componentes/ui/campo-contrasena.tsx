"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  id: string;
  etiqueta: string;
  ayuda?: string;
  errores?: string[];
};

/**
 * Campo de contraseña con un botón para mostrar u ocultar lo escrito (F-009, Historia 5, research O-13).
 *
 * Es un componente aparte y no una opción de Campo porque necesita estado en el navegador: Campo sigue
 * siendo de servidor y no suma JavaScript a los formularios que no tienen contraseñas. El marcado de
 * etiqueta, ayuda y errores es el mismo que el de Campo.
 *
 * Mostrar solo cambia el "type" del campo: el nombre y el valor no cambian, así que lo que se envía y
 * cómo se valida es exactamente lo mismo (FR-026).
 */
export function CampoContrasena({ id, etiqueta, ayuda, errores, className = "", ...resto }: Props) {
  // FR-024: cada campo empieza oculto y se muestra por separado.
  const [visible, setVisible] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  // FR-026: al enviar el formulario, con éxito o con errores, la contraseña vuelve a quedar oculta, para
  // que no quede a la vista si el formulario vuelve con un error.
  useEffect(() => {
    const formulario = campo.current?.form;
    if (!formulario) return;
    const ocultar = () => setVisible(false);
    formulario.addEventListener("submit", ocultar);
    return () => formulario.removeEventListener("submit", ocultar);
  }, []);

  const tieneErrores = Boolean(errores && errores.length > 0);
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idErrores = tieneErrores ? `${id}-errores` : undefined;
  const descritoPor = [idAyuda, idErrores].filter(Boolean).join(" ") || undefined;
  const accion = visible ? "Ocultar" : "Mostrar";

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {etiqueta}
      </label>
      <div className="relative">
        <input
          ref={campo}
          id={id}
          name={resto.name ?? id}
          type={visible ? "text" : "password"}
          aria-invalid={tieneErrores}
          aria-describedby={descritoPor}
          className={`w-full rounded-lg border py-2 pl-3 pr-24 text-base ${tieneErrores ? "border-error" : "border-borde-campo"} ${className}`}
          {...resto}
        />
        {/* FR-025: se usa con teclado; el texto y aria-pressed dicen si la contraseña está visible. El nombre
            accesible incluye la etiqueta del campo para distinguir los botones de un mismo formulario. */}
        <button
          type="button"
          onClick={() => setVisible((actual) => !actual)}
          aria-pressed={visible}
          aria-controls={id}
          aria-label={`${accion} «${etiqueta}»`}
          className="absolute inset-y-1 right-1 rounded-md px-3 text-sm font-semibold text-marca hover:bg-marca-claro"
        >
          {accion}
        </button>
      </div>
      {ayuda && (
        <p id={idAyuda} className="text-xs text-texto-suave">
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
