"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { mensajesPorLinea } from "@/componentes/formularios/errores-de-lineas";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import type { OpcionSelector } from "@/componentes/ui/selector";
import { esquemaPedido } from "@/esquemas/pedidos";
import { erroresPorRuta, type ResultadoAccion } from "@/lib/errores";

type Linea = { clave: number; productoId: string; cantidadSolicitada: string };
type Errores = Partial<Record<string, string[]>>;

export type ProductoParaPedido = OpcionSelector & { stockActual: number; abreviatura: string };

/** Valores de un pedido que se edita (Historia 4). */
export type ValoresPedido = {
  representanteId: number;
  fecha: string;
  observacion: string | null;
  lineas: { productoId: number; cantidadSolicitada: number }[];
};

let siguienteClave = 1;
function nuevaLinea(productoId = "", cantidadSolicitada = ""): Linea {
  siguienteClave += 1;
  return { clave: siguienteClave, productoId, cantidadSolicitada };
}

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

type Props = {
  accion: (datos: unknown) => Promise<ResultadoAccion>;
  representantes: OpcionSelector[];
  productos: ProductoParaPedido[];
  hoy: string;
  valores?: ValoresPedido;
  textoBoton: string;
  rutaCancelar: string;
};

/**
 * Formulario de pedido para registrar y editar (Historias 1 y 4, research P-09), con el patrón del
 * formulario de compra: todo lo escrito vive en el estado de React, así que si el servidor rechaza el
 * pedido nada se pierde. No envía estado ni cantidad entregada: los decide el sistema (RN-41, FR-009).
 */
export function FormularioPedido({ accion, representantes, productos, hoy, valores, textoBoton, rutaCancelar }: Props) {
  const [representanteId, setRepresentanteId] = useState(valores ? String(valores.representanteId) : "");
  const [fecha, setFecha] = useState(valores?.fecha ?? hoy);
  const [observacion, setObservacion] = useState(valores?.observacion ?? "");
  const [lineas, setLineas] = useState<Linea[]>(() =>
    valores ? valores.lineas.map((linea) => nuevaLinea(String(linea.productoId), String(linea.cantidadSolicitada))) : [nuevaLinea()],
  );
  const [erroresCliente, setErroresCliente] = useState<Errores>({});
  const [resultado, setResultado] = useState<ResultadoAccion>();
  const [enviando, iniciarEnvio] = useTransition();

  const productoPorId = new Map(productos.map((producto) => [String(producto.id), producto]));

  function datosDelFormulario() {
    return {
      representanteId,
      fecha,
      observacion,
      lineas: lineas.map(({ productoId, cantidadSolicitada }) => ({ productoId, cantidadSolicitada })),
    };
  }

  function validar(): Errores {
    const validacion = esquemaPedido.safeParse(datosDelFormulario());
    return validacion.success ? {} : erroresPorRuta(validacion.error);
  }

  /** Al salir de un campo se muestra solo su error, no el de campos todavía vacíos. */
  function alSalirDe(ruta: string) {
    setErroresCliente((previos) => ({ ...previos, [ruta]: validar()[ruta] }));
  }

  function cambiarLinea(clave: number, campo: "productoId" | "cantidadSolicitada", valor: string) {
    setLineas((actuales) => actuales.map((linea) => (linea.clave === clave ? { ...linea, [campo]: valor } : linea)));
  }

  function quitarLinea(clave: number) {
    setLineas((actuales) => (actuales.length === 1 ? actuales : actuales.filter((linea) => linea.clave !== clave)));
    // Al quitar una línea cambian los números de las siguientes: los errores viejos ya no corresponden.
    setErroresCliente({});
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
      // Si el pedido se guarda, la acción redirige a su ficha; si no, devuelve el motivo.
      setResultado(await accion(datos));
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="representanteId" className="text-sm font-medium">
            Representante
          </label>
          <select
            id="representanteId"
            value={representanteId}
            onChange={(e) => setRepresentanteId(e.target.value)}
            onBlur={() => alSalirDe("representanteId")}
            aria-invalid={Boolean(errores.representanteId)}
            aria-describedby={errores.representanteId ? "representanteId-errores" : undefined}
            className={claseCampo(errores.representanteId)}
          >
            <option value="">Elige un representante</option>
            {representantes.map((representante) => (
              <option key={representante.id} value={representante.id}>
                {representante.etiqueta}
              </option>
            ))}
          </select>
          <Errores id="representanteId-errores" mensajes={errores.representanteId} />
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="fecha" className="text-sm font-medium">
            Fecha del pedido
          </label>
          <input
            id="fecha"
            type="date"
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

        <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
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
        <h2 className="text-lg font-semibold">Productos</h2>
        <Errores id="lineas-errores" mensajes={errores.lineas} />

        {lineas.map((linea, indice) => {
          const ruta = (campo: string) => `lineas.${indice}.${campo}`;
          const id = (campo: string) => `linea-${linea.clave}-${campo}`;
          const producto = productoPorId.get(linea.productoId);
          const describeProducto = [producto ? id("stock") : "", errores[ruta("productoId")] ? id("producto-errores") : ""].filter(Boolean).join(" ");
          return (
            <fieldset key={linea.clave} className="grid gap-3 rounded-md border border-borde p-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_auto] sm:items-start">
              <legend className="px-1 text-sm font-medium">Línea {indice + 1}</legend>

              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor={id("producto")} className="text-xs text-texto-suave">
                  Producto
                </label>
                <select
                  id={id("producto")}
                  value={linea.productoId}
                  onChange={(e) => cambiarLinea(linea.clave, "productoId", e.target.value)}
                  onBlur={() => alSalirDe(ruta("productoId"))}
                  aria-invalid={Boolean(errores[ruta("productoId")])}
                  aria-describedby={describeProducto || undefined}
                  className={claseCampo(errores[ruta("productoId")])}
                >
                  <option value="">Elige un producto</option>
                  {productos.map((opcion) => (
                    <option key={opcion.id} value={opcion.id}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
                {/* FR-005: el stock es solo información; el pedido registra lo que se necesita, no lo que hay. */}
                {producto && (
                  <p id={id("stock")} className="text-xs text-texto-suave">
                    Stock actual: {producto.stockActual} {producto.abreviatura}
                  </p>
                )}
                <Errores id={id("producto-errores")} mensajes={errores[ruta("productoId")]} />
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor={id("cantidad")} className="text-xs text-texto-suave">
                  Cantidad solicitada
                </label>
                <input
                  id={id("cantidad")}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000000}
                  step={1}
                  value={linea.cantidadSolicitada}
                  onChange={(e) => cambiarLinea(linea.clave, "cantidadSolicitada", e.target.value)}
                  onBlur={() => alSalirDe(ruta("cantidadSolicitada"))}
                  aria-invalid={Boolean(errores[ruta("cantidadSolicitada")])}
                  aria-describedby={errores[ruta("cantidadSolicitada")] ? id("cantidad-errores") : undefined}
                  className={claseCampo(errores[ruta("cantidadSolicitada")])}
                />
                <Errores id={id("cantidad-errores")} mensajes={errores[ruta("cantidadSolicitada")]} />
              </div>

              <Boton
                variante="secundario"
                onClick={() => quitarLinea(linea.clave)}
                disabled={lineas.length === 1}
                aria-label={`Quitar línea ${indice + 1}`}
                className="sm:mt-5"
              >
                Quitar
              </Boton>
            </fieldset>
          );
        })}

        <Boton variante="secundario" onClick={() => setLineas((actuales) => [...actuales, nuevaLinea()])} className="self-start">
          Agregar producto
        </Boton>
        <p className="text-xs text-texto-suave">Registrar un pedido no mueve el stock: el stock sale al distribuir.</p>
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
