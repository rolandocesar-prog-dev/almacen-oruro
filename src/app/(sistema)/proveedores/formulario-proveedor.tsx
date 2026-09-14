"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useValidacion } from "@/componentes/formularios/use-validacion";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { Campo } from "@/componentes/ui/campo";
import { esquemaProveedor } from "@/esquemas/catalogos/proveedor";
import type { ResultadoAccion } from "@/lib/errores";

type Props = {
  accion: (estadoPrevio: ResultadoAccion | undefined, datos: FormData) => Promise<ResultadoAccion>;
  valores?: {
    razonSocial?: string;
    nit?: string;
    contactoNombre?: string | null;
    telefono?: string | null;
    correo?: string | null;
    direccion?: string | null;
  };
  textoBoton: string;
  rutaCancelar: string;
};

/** Formulario de proveedor para registrar o editar. Conserva lo escrito si el servidor rechaza. */
export function FormularioProveedor({ accion, valores = {}, textoBoton, rutaCancelar }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoAccion | undefined, FormData>(accion, undefined);
  const { errores, alEnviar, alSalirDelCampo } = useValidacion(esquemaProveedor, resultado, enviar);

  return (
    <form onSubmit={alEnviar} noValidate className="flex max-w-2xl flex-col gap-4 rounded-lg border border-borde bg-white p-6">
      {resultado?.ok === false && (
        <Aviso tipo="error" enlace={resultado.enlace}>
          {resultado.mensaje}
        </Aviso>
      )}
      <Campo
        id="razonSocial"
        etiqueta="Razón social"
        maxLength={100}
        defaultValue={valores.razonSocial}
        required
        errores={errores.razonSocial}
        onBlur={alSalirDelCampo}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          id="nit"
          etiqueta="NIT"
          ayuda="Solo dígitos, sin guiones ni puntos"
          inputMode="numeric"
          maxLength={20}
          defaultValue={valores.nit}
          required
          errores={errores.nit}
          onBlur={alSalirDelCampo}
        />
        <Campo
          id="contactoNombre"
          etiqueta="Nombre de contacto (opcional)"
          maxLength={80}
          defaultValue={valores.contactoNombre ?? ""}
          errores={errores.contactoNombre}
          onBlur={alSalirDelCampo}
        />
        <Campo
          id="telefono"
          etiqueta="Teléfono (opcional)"
          type="tel"
          maxLength={20}
          defaultValue={valores.telefono ?? ""}
          errores={errores.telefono}
          onBlur={alSalirDelCampo}
        />
        <Campo
          id="correo"
          etiqueta="Correo (opcional)"
          type="email"
          autoCapitalize="none"
          maxLength={100}
          defaultValue={valores.correo ?? ""}
          errores={errores.correo}
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
      <div className="flex flex-wrap gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : textoBoton}
        </Boton>
        <Link href={rutaCancelar} className="px-2 py-2 text-sm text-marca underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
