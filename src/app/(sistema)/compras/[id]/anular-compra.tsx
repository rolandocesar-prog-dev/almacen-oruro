"use client";

import { useActionState, type FormEvent } from "react";
import { useValidacion } from "@/componentes/formularios/use-validacion";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { esquemaAnulacion } from "@/esquemas/compras";
import type { ResultadoAccion } from "@/lib/errores";

type Props = {
  accion: (estadoPrevio: ResultadoAccion | undefined, datos: FormData) => Promise<ResultadoAccion>;
  nroFactura: string;
  cantidadProductos: number;
};

/**
 * Anulación de una compra con motivo obligatorio (Historia 5). Es la única corrección posible: una
 * compra no se edita (D-16). Si el stock ya se distribuyó, el servidor la rechaza y dice cuánto falta.
 */
export function AnularCompra({ accion, nroFactura, cantidadProductos }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoAccion | undefined, FormData>(accion, undefined);
  const { errores, alEnviar, alSalirDelCampo } = useValidacion(esquemaAnulacion, resultado, enviar);

  function confirmarYEnviar(evento: FormEvent<HTMLFormElement>) {
    const productos = cantidadProductos === 1 ? "su producto" : `sus ${cantidadProductos} productos`;
    const pregunta = `¿Anular la factura ${nroFactura}? Se revertirá el stock de ${productos}. Esta acción no se puede deshacer.`;
    // Solo se pregunta si el motivo ya está escrito: si falta, alEnviar muestra el error sin enviar.
    if (esquemaAnulacion.safeParse(Object.fromEntries(new FormData(evento.currentTarget))).success && !window.confirm(pregunta)) {
      evento.preventDefault();
      return;
    }
    alEnviar(evento);
  }

  const erroresMotivo = errores.motivo;

  return (
    <form onSubmit={confirmarYEnviar} noValidate className="flex max-w-2xl flex-col gap-3 rounded-lg border border-error/40 bg-white p-4">
      <h2 className="text-lg font-semibold">Anular compra</h2>
      <p className="text-sm text-texto-suave">
        Si la compra se registró con errores, anúlala indicando el motivo. Su stock se revierte en el kardex y la factura queda libre para
        registrarla bien.
      </p>
      {resultado && (
        <Aviso tipo={resultado.ok ? "exito" : "error"} enlace={resultado.ok ? undefined : resultado.enlace}>
          {resultado.mensaje}
        </Aviso>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="motivo" className="text-sm font-medium">
          Motivo de la anulación
        </label>
        <textarea
          id="motivo"
          name="motivo"
          rows={2}
          maxLength={200}
          onBlur={alSalirDelCampo}
          aria-invalid={Boolean(erroresMotivo)}
          aria-describedby={erroresMotivo ? "motivo-errores" : undefined}
          className={`rounded-md border px-3 py-2 text-base ${erroresMotivo ? "border-error" : "border-borde-campo"}`}
        />
        {erroresMotivo && (
          <ul id="motivo-errores" className="text-sm text-error">
            {erroresMotivo.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </div>
      <Boton type="submit" variante="peligro" disabled={enviando} className="self-start">
        {enviando ? "Anulando…" : "Anular compra"}
      </Boton>
    </form>
  );
}
