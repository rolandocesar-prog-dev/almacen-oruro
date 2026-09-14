"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useValidacion } from "@/componentes/formularios/use-validacion";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { Campo } from "@/componentes/ui/campo";
import { esquemaCentroSalud } from "@/esquemas/catalogos/centro-salud";
import type { ResultadoAccion } from "@/lib/errores";

type Props = {
  accion: (estadoPrevio: ResultadoAccion | undefined, datos: FormData) => Promise<ResultadoAccion>;
  valores?: { nombre?: string; telefono?: string | null; direccion?: string | null };
  textoBoton: string;
  rutaCancelar: string;
};

/** Formulario de centro de salud para registrar o editar. Conserva lo escrito si el servidor rechaza. */
export function FormularioCentroSalud({ accion, valores = {}, textoBoton, rutaCancelar }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoAccion | undefined, FormData>(accion, undefined);
  const { errores, alEnviar, alSalirDelCampo } = useValidacion(esquemaCentroSalud, resultado, enviar);

  return (
    <form onSubmit={alEnviar} noValidate className="flex max-w-2xl flex-col gap-4 rounded-lg border border-borde bg-white p-6">
      {resultado?.ok === false && (
        <Aviso tipo="error" enlace={resultado.enlace}>
          {resultado.mensaje}
        </Aviso>
      )}
      <Campo id="nombre" etiqueta="Nombre" maxLength={100} defaultValue={valores.nombre} required errores={errores.nombre} onBlur={alSalirDelCampo} />
      <div className="grid gap-4 sm:grid-cols-2">
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
          id="direccion"
          etiqueta="Dirección (opcional)"
          maxLength={150}
          defaultValue={valores.direccion ?? ""}
          errores={errores.direccion}
          onBlur={alSalirDelCampo}
        />
      </div>
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
