"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useValidacion } from "@/componentes/formularios/use-validacion";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { Campo } from "@/componentes/ui/campo";
import { esquemaCategoria } from "@/esquemas/catalogos/categoria";
import type { ResultadoAccion } from "@/lib/errores";

type Props = {
  accion: (estadoPrevio: ResultadoAccion | undefined, datos: FormData) => Promise<ResultadoAccion>;
  valores?: { nombre?: string; descripcion?: string | null };
  textoBoton: string;
  rutaCancelar: string;
};

/** Formulario de categoría para registrar o editar. Conserva lo escrito si el servidor rechaza. */
export function FormularioCategoria({ accion, valores = {}, textoBoton, rutaCancelar }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoAccion | undefined, FormData>(accion, undefined);
  const { errores, alEnviar, alSalirDelCampo } = useValidacion(esquemaCategoria, resultado, enviar);

  return (
    <form onSubmit={alEnviar} noValidate className="flex max-w-2xl flex-col gap-4 rounded-lg border border-borde bg-white p-6">
      {resultado?.ok === false && (
        <Aviso tipo="error" enlace={resultado.enlace}>
          {resultado.mensaje}
        </Aviso>
      )}
      <Campo id="nombre" etiqueta="Nombre" maxLength={60} defaultValue={valores.nombre} required errores={errores.nombre} onBlur={alSalirDelCampo} />
      <Campo
        id="descripcion"
        etiqueta="Descripción (opcional)"
        maxLength={200}
        defaultValue={valores.descripcion ?? ""}
        errores={errores.descripcion}
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
