"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { mensajesPorLinea } from "@/componentes/formularios/errores-de-lineas";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { esquemaDistribucion } from "@/esquemas/distribuciones";
import { erroresPorRuta, type EnlaceDeAviso, type ResultadoAccion } from "@/lib/errores";
import type { obtenerPedidoParaDistribuir } from "@/servicios/distribuciones";
import { registrarDistribucionAccion, verificarValeAccion } from "./acciones";

type PedidoParaDistribuir = NonNullable<Awaited<ReturnType<typeof obtenerPedidoParaDistribuir>>>;
type Errores = Partial<Record<string, string[]>>;

const claseCampo = (error?: string[]) => `w-full min-w-0 rounded-md border bg-white px-3 py-2 text-base ${error?.length ? "border-error" : "border-borde-campo"}`;

function Errores({ id, mensajes }: { id: string; mensajes?: string[] }) {
  if (!mensajes?.length) return null;
  return (
    <ul id={id} className="text-sm text-error">
      {mensajes.map((mensaje) => (
        <li key={mensaje}>{mensaje}</li>
      ))}
    </ul>
  );
}

/**
 * Formulario de distribución (Historia 1, research V-02). Muestra una fila por cada línea del pedido con lo
 * pendiente, el stock y el máximo entregable; las líneas completas o sin stock no admiten cantidad (FR-002).
 * Envía una entrada por fila, aunque esté vacía, para que cada error caiga en su fila. Todo lo escrito vive
 * en el estado de React: si el servidor rechaza la distribución, nada se pierde (FR-009).
 */
export function FormularioDistribucion({ pedido, hoy }: { pedido: PedidoParaDistribuir; hoy: string }) {
  const [nroVale, setNroVale] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [observacion, setObservacion] = useState("");
  const [cantidades, setCantidades] = useState<string[]>(() => pedido.lineas.map(() => ""));
  const [erroresCliente, setErroresCliente] = useState<Errores>({});
  const [resultado, setResultado] = useState<ResultadoAccion>();
  const [avisoVale, setAvisoVale] = useState<{ mensaje: string; enlace?: EnlaceDeAviso }>();
  const [enviando, iniciarEnvio] = useTransition();

  function datosDelFormulario() {
    return {
      pedidoId: pedido.id,
      nroVale,
      fecha,
      observacion,
      lineas: pedido.lineas.map((linea, indice) => ({ pedidoDetalleId: linea.pedidoDetalleId, cantidad: cantidades[indice] ?? "" })),
    };
  }

  function validar(): Errores {
    const validacion = esquemaDistribucion.safeParse(datosDelFormulario());
    return validacion.success ? {} : erroresPorRuta(validacion.error);
  }

  /** Al salir de un campo se muestra solo su error, no el de campos todavía vacíos. */
  function alSalirDe(ruta: string) {
    setErroresCliente((previos) => ({ ...previos, [ruta]: validar()[ruta] }));
  }

  /** RN-31: aviso inmediato si el vale ya está en una distribución vigente. */
  async function verificarVale(numero: string) {
    setAvisoVale(undefined);
    if (!numero.trim()) return;
    const respuesta = await verificarValeAccion(numero.trim());
    if (respuesta.ok && respuesta.datos.duplicado) {
      setAvisoVale({
        mensaje: `El vale ${numero.trim()} ya está registrado`,
        enlace: respuesta.datos.distribucionId ? { texto: "Ver distribución", ruta: `/distribuciones/${respuesta.datos.distribucionId}` } : undefined,
      });
    }
  }

  function cambiarCantidad(indice: number, valor: string) {
    setCantidades((actuales) => actuales.map((cantidad, i) => (i === indice ? valor : cantidad)));
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const errores = validar();
    setErroresCliente(errores);
    if (Object.keys(errores).length > 0) {
      setResultado({ ok: false, mensaje: "Revisa los datos marcados", errores });
      return;
    }
    const datos = datosDelFormulario();
    iniciarEnvio(async () => {
      // Si la distribución se guarda, la acción redirige a su ficha; si no, devuelve el motivo.
      setResultado(await registrarDistribucionAccion(datos));
    });
  }

  const erroresServidor = resultado?.ok === false ? (resultado.errores ?? {}) : {};
  const errores: Errores = { ...erroresServidor };
  for (const [ruta, mensajes] of Object.entries(erroresCliente)) if (mensajes) errores[ruta] = mensajes;
  const generales = mensajesPorLinea(errores);

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-5 rounded-lg border border-borde bg-white p-4 sm:p-6">
      {resultado?.ok === false && (
        <Aviso tipo="error" enlace={resultado.enlace}>
          {resultado.mensaje}
          {generales.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {generales.map((mensaje) => (
                <li key={mensaje}>{mensaje}</li>
              ))}
            </ul>
          )}
        </Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="nroVale" className="text-sm font-medium">
            Nº de vale
          </label>
          <input
            id="nroVale"
            inputMode="numeric"
            maxLength={20}
            autoComplete="off"
            value={nroVale}
            onChange={(e) => setNroVale(e.target.value)}
            onBlur={() => {
              alSalirDe("nroVale");
              void verificarVale(nroVale);
            }}
            aria-invalid={Boolean(errores.nroVale || avisoVale)}
            aria-describedby="nroVale-ayuda nroVale-errores"
            className={claseCampo(errores.nroVale ?? (avisoVale ? ["duplicado"] : undefined))}
          />
          <p id="nroVale-ayuda" className="text-xs text-texto-suave">
            Solo dígitos, tal como figura en el talonario
          </p>
          <Errores id="nroVale-errores" mensajes={errores.nroVale} />
          {avisoVale && !errores.nroVale && (
            <p role="alert" className="text-sm text-error">
              {avisoVale.mensaje}.{" "}
              {avisoVale.enlace && (
                <Link href={avisoVale.enlace.ruta} className="font-medium underline">
                  {avisoVale.enlace.texto}
                </Link>
              )}
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="fecha" className="text-sm font-medium">
            Fecha de la distribución
          </label>
          <input
            id="fecha"
            type="date"
            min={pedido.fecha}
            max={hoy}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            onBlur={() => alSalirDe("fecha")}
            aria-invalid={Boolean(errores.fecha)}
            aria-describedby={errores.fecha ? "fecha-errores" : undefined}
            className={claseCampo(errores.fecha)}
          />
          <Errores id="fecha-errores" mensajes={errores.fecha} />
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="observacion" className="text-sm font-medium">
            Observación (opcional)
          </label>
          <input
            id="observacion"
            maxLength={200}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            onBlur={() => alSalirDe("observacion")}
            aria-invalid={Boolean(errores.observacion)}
            aria-describedby={errores.observacion ? "observacion-errores" : undefined}
            className={claseCampo(errores.observacion)}
          />
          <Errores id="observacion-errores" mensajes={errores.observacion} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Productos del pedido</h2>
        <Errores id="lineas-errores" mensajes={errores.lineas} />

        {pedido.lineas.map((linea, indice) => {
          const ruta = `lineas.${indice}.cantidad`;
          const id = `linea-${linea.pedidoDetalleId}`;
          const erroresLinea = [...(errores[ruta] ?? []), ...(errores[`lineas.${indice}.pedidoDetalleId`] ?? [])];
          return (
            <fieldset key={linea.pedidoDetalleId} className="grid gap-3 rounded-md border border-borde p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,1fr)] sm:items-start">
              <legend className="px-1 text-sm font-medium">Línea {indice + 1}</legend>

              <p className="min-w-0 text-sm">
                <span className="block text-xs text-texto-suave">{linea.codigo}</span>
                <span className="font-medium">{linea.nombre}</span>
                {linea.productoActivo ? "" : " (inactivo)"}
              </p>

              <dl className="grid grid-cols-4 gap-2 text-sm tabular-nums">
                <div>
                  <dt className="text-xs text-texto-suave">Solicitado</dt>
                  <dd>
                    {linea.solicitada} {linea.unidad}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-texto-suave">Entregado</dt>
                  <dd>{linea.entregada}</dd>
                </div>
                <div>
                  <dt className="text-xs text-texto-suave">Pendiente</dt>
                  <dd>{linea.pendiente}</dd>
                </div>
                <div>
                  <dt className="text-xs text-texto-suave">Stock</dt>
                  <dd>{linea.stockActual}</dd>
                </div>
              </dl>

              {/* FR-002: las líneas completas o sin stock no admiten cantidad; el máximo es informativo (V-02). */}
              {linea.situacion === "entregable" ? (
                <div className="flex min-w-0 flex-col gap-1">
                  <label htmlFor={`${id}-cantidad`} className="text-xs text-texto-suave">
                    Cantidad a entregar
                  </label>
                  <input
                    id={`${id}-cantidad`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={linea.maximoEntregable}
                    step={1}
                    value={cantidades[indice] ?? ""}
                    onChange={(e) => cambiarCantidad(indice, e.target.value)}
                    onBlur={() => alSalirDe(ruta)}
                    aria-invalid={erroresLinea.length > 0}
                    aria-describedby={`${id}-maximo${erroresLinea.length > 0 ? ` ${id}-errores` : ""}`}
                    className={claseCampo(erroresLinea)}
                  />
                  <p id={`${id}-maximo`} className="text-xs text-texto-suave">
                    Máximo {linea.maximoEntregable}
                  </p>
                  <Errores id={`${id}-errores`} mensajes={erroresLinea} />
                </div>
              ) : (
                <p className="self-center text-sm font-medium text-texto-suave">{linea.situacion === "completa" ? "Completa" : "Sin stock"}</p>
              )}
            </fieldset>
          );
        })}
        <p className="text-xs text-texto-suave">
          Al guardar, el stock baja y el kardex registra la salida. Una distribución no se edita: si tiene un error, se anula.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Registrar distribución"}
        </Boton>
        <Link href={`/pedidos/${pedido.id}`} className="px-2 py-2 text-sm text-marca underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
