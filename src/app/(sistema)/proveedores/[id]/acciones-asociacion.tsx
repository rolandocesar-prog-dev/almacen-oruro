"use client";

import { useActionState } from "react";
import { useValidacion } from "@/componentes/formularios/use-validacion";
import { Boton } from "@/componentes/ui/boton";
import { esquemaCambioPrecio } from "@/esquemas/catalogos/proveedor-producto";
import type { ResultadoAccion } from "@/lib/errores";

type Props = {
  asociacionId: number;
  activo: boolean;
  /** Precio actual con coma, como se escribe ("12,50"), o vacío. */
  precioActual: string;
  cambiarPrecio: (estadoPrevio: ResultadoAccion | undefined, datos: FormData) => Promise<ResultadoAccion>;
  desactivar: () => Promise<ResultadoAccion>;
  reactivar: () => Promise<ResultadoAccion>;
};

/** Cambiar el precio en línea y quitar o volver a ofrecer un producto de la lista del proveedor. */
export function AccionesAsociacion({ asociacionId, activo, precioActual, cambiarPrecio, desactivar, reactivar }: Props) {
  const [resultadoPrecio, enviarPrecio, guardando] = useActionState<ResultadoAccion | undefined, FormData>(cambiarPrecio, undefined);
  const { errores, alEnviar } = useValidacion(esquemaCambioPrecio, resultadoPrecio, enviarPrecio);
  const [resultadoEstado, cambiarEstado, cambiando] = useActionState<ResultadoAccion | undefined>(
    () => (activo ? desactivar() : reactivar()),
    undefined,
  );

  const idPrecio = `precio-${asociacionId}`;
  const errorPrecio = errores.precioReferencial?.[0] ?? (resultadoPrecio?.ok === false ? resultadoPrecio.mensaje : undefined);
  const mensaje = errorPrecio ?? (resultadoEstado?.ok === false ? resultadoEstado.mensaje : undefined);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {activo && (
          <form onSubmit={alEnviar} noValidate className="flex items-center gap-2">
            <label htmlFor={idPrecio} className="sr-only">
              Precio referencial en Bs
            </label>
            <input
              id={idPrecio}
              name="precioReferencial"
              inputMode="decimal"
              maxLength={14}
              defaultValue={precioActual}
              placeholder="Sin precio"
              aria-invalid={Boolean(errorPrecio)}
              className={`w-28 rounded-md border px-2 py-1 ${errorPrecio ? "border-error" : "border-borde"}`}
            />
            <Boton type="submit" variante="secundario" disabled={guardando} className="px-3 py-1">
              {guardando ? "Guardando…" : "Guardar precio"}
            </Boton>
          </form>
        )}
        <form action={cambiarEstado}>
          <Boton type="submit" variante={activo ? "peligro" : "secundario"} disabled={cambiando} className="px-3 py-1">
            {activo ? "Quitar" : "Reactivar"}
          </Boton>
        </form>
      </div>
      {mensaje && (
        <p role="alert" className="whitespace-normal text-sm text-error">
          {mensaje}
        </p>
      )}
      {resultadoPrecio?.ok && !errorPrecio && (
        <p role="status" className="text-sm text-exito">
          {resultadoPrecio.mensaje}
        </p>
      )}
    </div>
  );
}
