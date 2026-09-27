"use client";

import { useActionState } from "react";
import { useValidacion } from "@/componentes/formularios/use-validacion";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { CampoContrasena } from "@/componentes/ui/campo-contrasena";
import { esquemaCambioContrasena } from "@/esquemas/personal";
import type { ResultadoAccion } from "@/lib/errores";
import { cambiarMiContrasenaAccion } from "./acciones";

export function FormularioCambioContrasena() {
  const [resultado, enviar, enviando] = useActionState<ResultadoAccion | undefined, FormData>(cambiarMiContrasenaAccion, undefined);
  const { errores, alEnviar, alSalirDelCampo } = useValidacion(esquemaCambioContrasena, resultado, enviar);

  return (
    <form onSubmit={alEnviar} noValidate className="flex max-w-md flex-col gap-4 rounded-lg border border-borde bg-white p-6">
      {resultado?.ok === false && <Aviso tipo="error">{resultado.mensaje}</Aviso>}
      <CampoContrasena
        id="contrasenaActual"
        etiqueta="Contraseña actual"
        autoComplete="current-password"
        required
        errores={errores.contrasenaActual}
        onBlur={alSalirDelCampo}
      />
      <CampoContrasena
        id="contrasenaNueva"
        etiqueta="Contraseña nueva"
        ayuda="Al menos 8 caracteres, distinta de la actual"
        autoComplete="new-password"
        required
        errores={errores.contrasenaNueva}
        onBlur={alSalirDelCampo}
      />
      <CampoContrasena
        id="confirmacion"
        etiqueta="Repite la contraseña nueva"
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
