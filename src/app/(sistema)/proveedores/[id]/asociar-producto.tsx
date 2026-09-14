"use client";

import { useActionState, useEffect, useRef } from "react";
import { useValidacion } from "@/componentes/formularios/use-validacion";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { Campo } from "@/componentes/ui/campo";
import { Selector, type OpcionSelector } from "@/componentes/ui/selector";
import { esquemaProveedorProducto } from "@/esquemas/catalogos/proveedor-producto";
import type { ResultadoAccion } from "@/lib/errores";

type Props = {
  accion: (estadoPrevio: ResultadoAccion | undefined, datos: FormData) => Promise<ResultadoAccion>;
  productos: OpcionSelector[];
};

/** Formulario para agregar un producto a la lista del proveedor, con precio referencial opcional. */
export function AsociarProducto({ accion, productos }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoAccion | undefined, FormData>(accion, undefined);
  const { errores, alEnviar, alSalirDelCampo } = useValidacion(esquemaProveedorProducto, resultado, enviar);
  const formulario = useRef<HTMLFormElement>(null);

  // Tras agregar, el formulario queda vacío para el siguiente producto. Si el servidor rechaza, se
  // conserva lo escrito.
  useEffect(() => {
    if (resultado?.ok) formulario.current?.reset();
  }, [resultado]);

  return (
    <form ref={formulario} onSubmit={alEnviar} noValidate className="flex flex-col gap-3 rounded-lg border border-borde bg-white p-4">
      <h3 className="font-semibold">Agregar un producto</h3>
      {resultado && (
        <Aviso tipo={resultado.ok ? "exito" : "error"} enlace={resultado.ok ? undefined : resultado.enlace}>
          {resultado.mensaje}
        </Aviso>
      )}
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-start">
        <Selector
          id="productoId"
          etiqueta="Producto"
          textoVacio="Elige un producto"
          opciones={productos}
          defaultValue=""
          required
          errores={errores.productoId}
          onBlur={alSalirDelCampo}
        />
        <Campo
          id="precioReferencial"
          etiqueta="Precio referencial en Bs (opcional)"
          inputMode="decimal"
          placeholder="12,50"
          maxLength={14}
          errores={errores.precioReferencial}
          onBlur={alSalirDelCampo}
        />
        <Boton type="submit" disabled={enviando} className="sm:mt-6">
          {enviando ? "Agregando…" : "Agregar"}
        </Boton>
      </div>
    </form>
  );
}
