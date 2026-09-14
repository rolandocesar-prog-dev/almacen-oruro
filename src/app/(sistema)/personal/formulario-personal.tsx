"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useValidacion } from "@/componentes/formularios/use-validacion";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { Campo } from "@/componentes/ui/campo";
import { esquemaDatosPersonales, esquemaRegistroPersonal } from "@/esquemas/personal";
import type { ResultadoAccion } from "@/lib/errores";

type ValoresIniciales = {
  nombre?: string;
  apellido?: string;
  cargo?: string;
  direccion?: string | null;
  telefono?: string | null;
  nombreUsuario?: string;
};

type Props = {
  modo: "registro" | "edicion";
  accion: (estadoPrevio: ResultadoAccion | undefined, datos: FormData) => Promise<ResultadoAccion>;
  valores?: ValoresIniciales;
  rutaCancelar: string;
};

/** Formulario de personal, para registrar (con contraseña) o editar (sin contraseña). */
export function FormularioPersonal({ modo, accion, valores = {}, rutaCancelar }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoAccion | undefined, FormData>(accion, undefined);
  // En edición la contraseña no se toca: solo cambia por "Cambiar mi contraseña" o "Restablecer" (FR-015).
  const esquema = modo === "registro" ? esquemaRegistroPersonal : esquemaDatosPersonales;
  const { errores, alEnviar, alSalirDelCampo } = useValidacion(esquema, resultado, enviar);

  return (
    <form onSubmit={alEnviar} noValidate className="flex max-w-2xl flex-col gap-4 rounded-lg border border-borde bg-white p-6">
      {resultado?.ok === false && <Aviso tipo="error">{resultado.mensaje}</Aviso>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="nombre" etiqueta="Nombre" maxLength={60} defaultValue={valores.nombre} required errores={errores.nombre} onBlur={alSalirDelCampo} />
        <Campo id="apellido" etiqueta="Apellido" maxLength={60} defaultValue={valores.apellido} required errores={errores.apellido} onBlur={alSalirDelCampo} />
        <Campo id="cargo" etiqueta="Cargo" maxLength={60} defaultValue={valores.cargo} required errores={errores.cargo} onBlur={alSalirDelCampo} />
        <Campo
          id="telefono"
          etiqueta="Teléfono (opcional)"
          type="tel"
          maxLength={20}
          defaultValue={valores.telefono ?? ""}
          errores={errores.telefono}
          onBlur={alSalirDelCampo}
        />
      </div>
      <Campo
        id="direccion"
        etiqueta="Dirección (opcional)"
        maxLength={150}
        defaultValue={valores.direccion ?? ""}
        errores={errores.direccion}
        onBlur={alSalirDelCampo}
      />
      <Campo
        id="nombreUsuario"
        etiqueta="Nombre de usuario"
        ayuda="De 3 a 30 caracteres: letras minúsculas sin tildes, dígitos, punto o guion bajo"
        maxLength={30}
        autoCapitalize="none"
        autoComplete="off"
        defaultValue={valores.nombreUsuario}
        required
        errores={errores.nombreUsuario}
        onBlur={alSalirDelCampo}
      />

      {modo === "registro" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="contrasena"
            etiqueta="Contraseña inicial"
            type="password"
            ayuda="Al menos 8 caracteres"
            autoComplete="new-password"
            required
            errores={errores.contrasena}
            onBlur={alSalirDelCampo}
          />
          <Campo
            id="confirmacion"
            etiqueta="Repite la contraseña"
            type="password"
            autoComplete="new-password"
            required
            errores={errores.confirmacion}
            onBlur={alSalirDelCampo}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : modo === "registro" ? "Registrar" : "Guardar cambios"}
        </Boton>
        <Link href={rutaCancelar} className="px-2 py-2 text-sm text-marca underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
