"use client";

import { useActionState } from "react";
import { useValidacion } from "@/componentes/formularios/use-validacion";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { Campo } from "@/componentes/ui/campo";
import { CampoContrasena } from "@/componentes/ui/campo-contrasena";
import { esquemaIngreso } from "@/esquemas/acceso";
import type { ResultadoAccion } from "@/lib/errores";
import { ingresar } from "./acciones";

export function FormularioIngreso() {
  const [resultado, accion, enviando] = useActionState<ResultadoAccion | undefined, FormData>(ingresar, undefined);
  const { errores, alEnviar, alSalirDelCampo } = useValidacion(esquemaIngreso, resultado, accion);

  return (
    <form onSubmit={alEnviar} noValidate className="flex flex-col gap-4">
      {resultado?.ok === false && !resultado.errores && <Aviso tipo="error">{resultado.mensaje}</Aviso>}

      <Campo
        id="nombreUsuario"
        etiqueta="Nombre de usuario"
        autoComplete="username"
        autoCapitalize="none"
        required
        errores={errores.nombreUsuario}
        onBlur={alSalirDelCampo}
      />
      <CampoContrasena
        id="contrasena"
        etiqueta="Contraseña"
        autoComplete="current-password"
        required
        errores={errores.contrasena}
        onBlur={alSalirDelCampo}
      />

      <Boton type="submit" disabled={enviando}>
        {enviando ? "Ingresando…" : "Ingresar"}
      </Boton>
    </form>
  );
}
