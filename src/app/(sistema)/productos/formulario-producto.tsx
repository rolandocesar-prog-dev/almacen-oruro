"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useValidacion } from "@/componentes/formularios/use-validacion";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { Campo } from "@/componentes/ui/campo";
import { Selector, type OpcionSelector } from "@/componentes/ui/selector";
import { esquemaProducto } from "@/esquemas/catalogos/producto";
import type { ResultadoAccion } from "@/lib/errores";

type Props = {
  accion: (estadoPrevio: ResultadoAccion | undefined, datos: FormData) => Promise<ResultadoAccion>;
  categorias: OpcionSelector[];
  unidades: OpcionSelector[];
  valores?: {
    codigo?: string;
    nombre?: string;
    descripcion?: string | null;
    categoriaId?: number;
    unidadMedidaId?: number;
    stockMinimo?: number;
  };
  /** Solo en edición: se muestra como texto, nunca como campo del formulario (RN-15). */
  edicion?: { stockActual: number; unidad: string; tieneMovimientos: boolean };
  textoBoton: string;
  rutaCancelar: string;
};

/** Formulario de producto para registrar o editar. Conserva lo escrito si el servidor rechaza. */
export function FormularioProducto({ accion, categorias, unidades, valores = {}, edicion, textoBoton, rutaCancelar }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoAccion | undefined, FormData>(accion, undefined);
  const { errores, alEnviar, alSalirDelCampo } = useValidacion(esquemaProducto, resultado, enviar);
  // RN-16: con movimientos, la unidad queda fija. Un <select> deshabilitado no se envía, así que
  // su valor viaja en un campo oculto (y el servidor vuelve a verificar la regla).
  const unidadBloqueada = Boolean(edicion?.tieneMovimientos);

  return (
    <form onSubmit={alEnviar} noValidate className="flex max-w-2xl flex-col gap-4 rounded-lg border border-borde bg-white p-6">
      {resultado?.ok === false && (
        <Aviso tipo="error" enlace={resultado.enlace}>
          {resultado.mensaje}
        </Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          id="codigo"
          etiqueta="Código"
          ayuda="Hasta 20 caracteres: letras sin Ñ ni tildes, dígitos y guion. Ej.: LIM-001"
          maxLength={20}
          autoCapitalize="characters"
          autoComplete="off"
          defaultValue={valores.codigo}
          required
          errores={errores.codigo}
          onBlur={alSalirDelCampo}
        />
        <Campo id="nombre" etiqueta="Nombre" maxLength={80} defaultValue={valores.nombre} required errores={errores.nombre} onBlur={alSalirDelCampo} />
      </div>
      <Campo
        id="descripcion"
        etiqueta="Descripción (opcional)"
        maxLength={200}
        defaultValue={valores.descripcion ?? ""}
        errores={errores.descripcion}
        onBlur={alSalirDelCampo}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Selector
          id="categoriaId"
          etiqueta="Categoría"
          textoVacio="Elige una categoría"
          opciones={categorias}
          defaultValue={valores.categoriaId ?? ""}
          required
          errores={errores.categoriaId}
          onBlur={alSalirDelCampo}
        />
        <div className="flex flex-col gap-1">
          <Selector
            id="unidadMedidaId"
            name={unidadBloqueada ? "unidadMedidaIdBloqueada" : "unidadMedidaId"}
            etiqueta="Unidad de medida"
            textoVacio="Elige una unidad de medida"
            opciones={unidades}
            defaultValue={valores.unidadMedidaId ?? ""}
            disabled={unidadBloqueada}
            ayuda={unidadBloqueada ? "No se puede cambiar: el producto tiene movimientos" : undefined}
            required
            errores={errores.unidadMedidaId}
            onBlur={alSalirDelCampo}
          />
          {unidadBloqueada && <input type="hidden" name="unidadMedidaId" value={valores.unidadMedidaId} />}
        </div>
        <Campo
          id="stockMinimo"
          etiqueta="Stock mínimo"
          ayuda="Con el stock en este valor o menos, el producto se marca 'Bajo mínimo'"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          defaultValue={valores.stockMinimo ?? ""}
          required
          errores={errores.stockMinimo}
          onBlur={alSalirDelCampo}
        />
        {edicion && (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Stock actual</span>
            <p className="py-2 text-base">
              {edicion.stockActual} ({edicion.unidad})
            </p>
            <p className="text-xs text-texto-suave">Solo cambia con compras y distribuciones.</p>
          </div>
        )}
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
