"use client";

import { useActionState } from "react";
import { useValidacion } from "@/componentes/formularios/use-validacion";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { Campo } from "@/componentes/ui/campo";
import { esquemaCambioContrasena } from "@/esquemas/personal";
import type { ResultadoAccion } from "@/lib/errores";
import { cambiarMiContrasenaAccion } from "./acciones";

export function FormularioCambioContrasena() {
  const [resultado, enviar, enviando] = useActionState<ResultadoAccion | undefined, FormData>(cambiarMiContrasenaAccion, undefined);
  const { errores, alEnviar, alSalirDelCampo } = useValidacion(esquemaCambioContrasena, resultado, enviar);

  return (
    <form onSubmit={alEnviar} noValidate className="flex max-w-md flex-col gap-4 rounded-lg border border-borde bg-white p-6">
      {resultado?.ok === false && <Aviso tipo="error">{resultado.mensaje}</Aviso>}
      <Campo
        id="contrasenaActual"
        etiqueta="Contraseña actual"
        type="password"
        autoComplete="current-password"
        required
        errores={errores.contrasenaActual}
        onBlur={alSalirDelCampo}
      />
      <Campo
        id="contrasenaNueva"
        etiqueta="Contraseña nueva"
        type="password"
        ayuda="Al menos 8 caracteres, distinta de la actual"
        autoComplete="new-password"
        required
        errores={errores.contrasenaNueva}
        onBlur={alSalirDelCampo}
      />
      <Campo
        id="confirmacion"
        etiqueta="Repite la contraseña nueva"
        type="password"
        autoComplete="new-password"
        required
        errores={errores.confirmacion}
        onBlur={alSalirDelCampo}
      />
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Guardando…" : "Cambiar contraseña"}
      </Boton>
    </form>
  );
}
