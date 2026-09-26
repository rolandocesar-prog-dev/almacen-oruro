"use client";

import { useActionState, type FormEvent } from "react";
import { useValidacion } from "@/componentes/formularios/use-validacion";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { esquemaAnulacionDistribucion } from "@/esquemas/distribuciones";
import type { ResultadoAccion } from "@/lib/errores";

type Props = {
  accion: (estadoPrevio: ResultadoAccion | undefined, datos: FormData) => Promise<ResultadoAccion>;
  nroVale: string;
  pedidoId: number;
  cantidadProductos: number;
};

/**
 * Anulación de una distribución con motivo obligatorio (Historia 4, RN-35). Es la única corrección posible:
 * una distribución no se edita (D-16). Repone el stock y descuenta lo entregado del pedido.
 */
export function AnularDistribucion({ accion, nroVale, pedidoId, cantidadProductos }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoAccion | undefined, FormData>(accion, undefined);
  const { errores, alEnviar, alSalirDelCampo } = useValidacion(esquemaAnulacionDistribucion, resultado, enviar);

  function confirmarYEnviar(evento: FormEvent<HTMLFormElement>) {
    const productos = cantidadProductos === 1 ? "su producto" : `sus ${cantidadProductos} productos`;
    const pregunta = `¿Anular el vale ${nroVale}? Se repondrá el stock de ${productos} y se descontará lo entregado del pedido Nº ${pedidoId}. Esta acción no se puede deshacer.`;
    // Solo se pregunta si el motivo ya está escrito: si falta, alEnviar muestra el error sin enviar.
    if (esquemaAnulacionDistribucion.safeParse(Object.fromEntries(new FormData(evento.currentTarget))).success && !window.confirm(pregunta)) {
      evento.preventDefault();
      return;
    }
    alEnviar(evento);
  }

  const erroresMotivo = errores.motivo;

  return (
    <form onSubmit={confirmarYEnviar} noValidate className="flex max-w-2xl flex-col gap-3 rounded-lg border border-error/40 bg-white p-4">
      <h2 className="text-lg font-semibold">Anular distribución</h2>
      <p className="text-sm text-texto-suave">
        Si la distribución se registró con errores, anúlala indicando el motivo. El stock vuelve al almacén en el kardex y lo entregado del
        pedido se descuenta. Después puedes registrarla bien con el mismo Nº de vale.
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
        {enviando ? "Anulando…" : "Anular distribución"}
      </Boton>
    </form>
  );
}
