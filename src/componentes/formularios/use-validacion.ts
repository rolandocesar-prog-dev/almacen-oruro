"use client";

import { startTransition, useState, type FocusEvent, type FormEvent } from "react";
import { z, type ZodType } from "zod";
import type { ResultadoAccion } from "@/lib/errores";

export type ErroresPorCampo = Partial<Record<string, string[]>>;

/**
 * Validación en el cliente con el mismo esquema Zod que usa la Server Action (principio VI).
 *
 * - Al enviar: valida todo el formulario; si hay errores, no llama al servidor.
 * - Al salir de un campo: muestra solo el error de ese campo, no los de campos aún vacíos.
 * - Combina estos errores con los que devolvió el servidor (por ejemplo, un duplicado).
 *
 * La acción se llama desde onSubmit (y no con `<form action>`) porque React vacía el formulario
 * después de cada envío por `action`: así, si el servidor rechaza los datos, lo escrito se conserva.
 */
// El prefijo "use" lo exige React para los hooks (constitución, principio X: nombres impuestos por el framework).
export function useValidacion(
  esquema: ZodType,
  resultado: ResultadoAccion<unknown> | undefined,
  accion: (datos: FormData) => void,
) {
  const [erroresCliente, setErroresCliente] = useState<ErroresPorCampo>({});

  function erroresDelFormulario(formulario: HTMLFormElement): ErroresPorCampo {
    const validacion = esquema.safeParse(Object.fromEntries(new FormData(formulario)));
    return validacion.success ? {} : z.flattenError(validacion.error).fieldErrors;
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const errores = erroresDelFormulario(evento.currentTarget);
    setErroresCliente(errores);
    if (Object.keys(errores).length > 0) return;
    const datos = new FormData(evento.currentTarget);
    startTransition(() => accion(datos));
  }

  function alSalirDelCampo(evento: FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { form, name } = evento.currentTarget;
    if (!form) return;
    setErroresCliente((previos) => ({ ...previos, [name]: erroresDelFormulario(form)[name] }));
  }

  // Los errores del cliente (más recientes) tienen prioridad sobre los del servidor.
  const errores: ErroresPorCampo = { ...(resultado?.ok === false ? resultado.errores : {}) };
  for (const [campo, mensajes] of Object.entries(erroresCliente)) {
    if (mensajes) errores[campo] = mensajes;
  }

  return { errores, alEnviar, alSalirDelCampo };
}
