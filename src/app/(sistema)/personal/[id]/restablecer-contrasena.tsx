"use client";

import { useActionState, useRef } from "react";
import { useValidacion } from "@/componentes/formularios/use-validacion";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { Campo } from "@/componentes/ui/campo";
import { esquemaRestablecimiento } from "@/esquemas/personal";
import type { ResultadoAccion } from "@/lib/errores";

type Props = {
  accion: (estadoPrevio: ResultadoAccion | undefined, datos: FormData) => Promise<ResultadoAccion>;
};

/** Restablecer la contraseña de otra persona con una temporal (Historia 5, FR-020). */
export function RestablecerContrasena({ accion }: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const [resultado, enviar, enviando] = useActionState<ResultadoAccion | undefined, FormData>(async (previo, datos) => {
    const respuesta = await accion(previo, datos);
    // Tras restablecer, se vacían los campos: la temporal no debe quedar escrita en pantalla.
    if (respuesta.ok) formulario.current?.reset();
    return respuesta;
  }, undefined);
  const { errores, alEnviar, alSalirDelCampo } = useValidacion(esquemaRestablecimiento, resultado, enviar);

  return (
    <form ref={formulario} onSubmit={alEnviar} noValidate className="flex max-w-2xl flex-col gap-4 rounded-lg border border-borde bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold">Restablecer contraseña</h2>
        <p className="text-sm text-gray-600">
          Comunica la contraseña temporal en persona; deberá cambiarla al ingresar.
        </p>
      </div>
      {resultado && <Aviso tipo={resultado.ok ? "exito" : "error"}>{resultado.mensaje}</Aviso>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          id="contrasenaTemporal"
          etiqueta="Contraseña temporal"
          type="password"
          ayuda="Al menos 8 caracteres"
          autoComplete="new-password"
          required
          errores={errores.contrasenaTemporal}
          onBlur={alSalirDelCampo}
        />
        <Campo
          id="confirmacionTemporal"
          name="confirmacion"
          etiqueta="Repite la contraseña temporal"
          type="password"
          autoComplete="new-password"
          required
          errores={errores.confirmacion}
          onBlur={alSalirDelCampo}
        />
      </div>
      <div>
        <Boton type="submit" variante="secundario" disabled={enviando}>
          {enviando ? "Restableciendo…" : "Restablecer contraseña"}
        </Boton>
      </div>
    </form>
  );
}
