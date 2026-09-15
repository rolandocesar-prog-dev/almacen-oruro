"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import type { OpcionSelector } from "@/componentes/ui/selector";
import { esquemaCompra } from "@/esquemas/compras";
import { aCentavos, formatearCentavos } from "@/lib/dinero";
import { erroresPorRuta, type EnlaceDeAviso, type ResultadoAccion } from "@/lib/errores";
import { registrarCompraAccion, verificarFacturaAccion } from "./acciones";

type Linea = { clave: number; productoId: string; cantidad: string; precioUnitario: string };
type Errores = Partial<Record<string, string[]>>;

let siguienteClave = 1;
function lineaVacia(): Linea {
  siguienteClave += 1;
  return { clave: siguienteClave, productoId: "", cantidad: "", precioUnitario: "" };
}

/** Subtotal de la vista previa en centavos, o null si la cantidad o el precio todavía no son válidos. */
function subtotalCentavos(linea: Linea): number | null {
  const centavos = aCentavos(linea.precioUnitario);
  if (centavos === null || !/^\d{1,7}$/.test(linea.cantidad.trim())) return null;
  return Number(linea.cantidad) * centavos;
}

/** Mensajes de las líneas con su número, para leerlos en el aviso sin buscar en la tabla (FR-007). */
function mensajesGenerales(errores: Errores): string[] {
  return Object.entries(errores).flatMap(([ruta, mensajes = []]) => {
    const linea = /^lineas\.(\d+)\./.exec(ruta);
    if (!linea) return ruta === "lineas" ? mensajes : [];
    return mensajes.map((mensaje) => (mensaje.startsWith("Línea") ? mensaje : `Línea ${Number(linea[1]) + 1}: ${mensaje.charAt(0).toLowerCase()}${mensaje.slice(1)}`));
  });
}

const claseCampo = (error?: string[]) => `w-full min-w-0 rounded-md border bg-white px-3 py-2 text-base ${error?.length ? "border-error" : "border-borde"}`;

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
 * Formulario de compra con líneas dinámicas (Historia 1, research K-03).
 * Todo lo escrito vive en el estado de React: si el servidor rechaza la compra, nada se pierde. La
 * vista previa suma en centavos enteros; los montos que se guardan los calcula el servidor (RN-23).
 */
export function FormularioCompra({ proveedores, productos, hoy }: { proveedores: OpcionSelector[]; productos: OpcionSelector[]; hoy: string }) {
  const [proveedorId, setProveedorId] = useState("");
  const [nroFactura, setNroFactura] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [observacion, setObservacion] = useState("");
  const [lineas, setLineas] = useState<Linea[]>(() => [lineaVacia()]);
  const [erroresCliente, setErroresCliente] = useState<Errores>({});
  const [resultado, setResultado] = useState<ResultadoAccion>();
  const [avisoFactura, setAvisoFactura] = useState<{ mensaje: string; enlace?: EnlaceDeAviso }>();
  const [enviando, iniciarEnvio] = useTransition();

  function datosDelFormulario() {
    return {
      proveedorId,
      nroFactura,
      fecha,
      observacion,
      lineas: lineas.map(({ productoId, cantidad, precioUnitario }) => ({ productoId, cantidad, precioUnitario })),
    };
  }

  function validar(): Errores {
    const validacion = esquemaCompra.safeParse(datosDelFormulario());
    return validacion.success ? {} : erroresPorRuta(validacion.error);
  }

  /** Al salir de un campo se muestra solo su error, no el de campos todavía vacíos. */
  function alSalirDe(ruta: string) {
    setErroresCliente((previos) => ({ ...previos, [ruta]: validar()[ruta] }));
  }

  /** RN-21: aviso inmediato de factura ya registrada para el proveedor elegido. */
  async function verificarFactura(proveedor: string, numero: string) {
    setAvisoFactura(undefined);
    if (!proveedor || !numero.trim()) return;
    const respuesta = await verificarFacturaAccion(Number(proveedor), numero.trim());
    if (respuesta.ok && respuesta.datos.duplicada) {
      setAvisoFactura({
        mensaje: `La factura ${numero.trim()} ya está registrada para este proveedor`,
        enlace: respuesta.datos.compraId ? { texto: "Ver compra", ruta: `/compras/${respuesta.datos.compraId}` } : undefined,
      });
    }
  }

  function cambiarLinea(clave: number, campo: keyof Omit<Linea, "clave">, valor: string) {
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
      // Si la compra se guarda, la acción redirige a su ficha; si no, devuelve el motivo.
      setResultado(await registrarCompraAccion(datos));
    });
  }

  const erroresServidor = resultado?.ok === false ? (resultado.errores ?? {}) : {};
  const errores: Errores = { ...erroresServidor };
  for (const [ruta, mensajes] of Object.entries(erroresCliente)) if (mensajes) errores[ruta] = mensajes;
  const generales = mensajesGenerales(errores);

  const subtotales = lineas.map(subtotalCentavos);
  const totalCentavos = subtotales.every((subtotal) => subtotal !== null) ? subtotales.reduce<number>((suma, s) => suma + (s ?? 0), 0) : null;

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
          <label htmlFor="proveedorId" className="text-sm font-medium">
            Proveedor
          </label>
          <select
            id="proveedorId"
            value={proveedorId}
            onChange={(e) => {
              setProveedorId(e.target.value);
              void verificarFactura(e.target.value, nroFactura);
            }}
            onBlur={() => alSalirDe("proveedorId")}
            aria-invalid={Boolean(errores.proveedorId)}
            aria-describedby={errores.proveedorId ? "proveedorId-errores" : undefined}
            className={claseCampo(errores.proveedorId)}
          >
            <option value="">Elige un proveedor</option>
            {proveedores.map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.etiqueta}
              </option>
            ))}
          </select>
          <Errores id="proveedorId-errores" mensajes={errores.proveedorId} />
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="nroFactura" className="text-sm font-medium">
            Nº de factura
          </label>
          <input
            id="nroFactura"
            inputMode="numeric"
            maxLength={20}
            autoComplete="off"
            value={nroFactura}
            onChange={(e) => setNroFactura(e.target.value)}
            onBlur={() => {
              alSalirDe("nroFactura");
              void verificarFactura(proveedorId, nroFactura);
            }}
            aria-invalid={Boolean(errores.nroFactura || avisoFactura)}
            aria-describedby="nroFactura-ayuda nroFactura-errores"
            className={claseCampo(errores.nroFactura ?? (avisoFactura ? ["duplicada"] : undefined))}
          />
          <p id="nroFactura-ayuda" className="text-xs text-gray-600">
            Solo dígitos, tal como figura en la factura
          </p>
          <Errores id="nroFactura-errores" mensajes={errores.nroFactura} />
          {avisoFactura && !errores.nroFactura && (
            <p role="alert" className="text-sm text-error">
              {avisoFactura.mensaje}.{" "}
              {avisoFactura.enlace && (
                <Link href={avisoFactura.enlace.ruta} className="font-medium underline">
                  {avisoFactura.enlace.texto}
                </Link>
              )}
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="fecha" className="text-sm font-medium">
            Fecha de la factura
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
        <h2 className="text-lg font-semibold">Productos</h2>
        <Errores id="lineas-errores" mensajes={errores.lineas} />

        {lineas.map((linea, indice) => {
          const ruta = (campo: string) => `lineas.${indice}.${campo}`;
          const id = (campo: string) => `linea-${linea.clave}-${campo}`;
          const subtotal = subtotales[indice];
          return (
            <fieldset key={linea.clave} className="grid gap-3 rounded-md border border-borde p-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-start">
              <legend className="px-1 text-sm font-medium">Línea {indice + 1}</legend>

              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor={id("producto")} className="text-xs text-gray-700">
                  Producto
                </label>
                <select
                  id={id("producto")}
                  value={linea.productoId}
                  onChange={(e) => cambiarLinea(linea.clave, "productoId", e.target.value)}
                  onBlur={() => alSalirDe(ruta("productoId"))}
                  aria-invalid={Boolean(errores[ruta("productoId")])}
                  aria-describedby={errores[ruta("productoId")] ? id("producto-errores") : undefined}
                  className={claseCampo(errores[ruta("productoId")])}
                >
                  <option value="">Elige un producto</option>
                  {productos.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.etiqueta}
                    </option>
                  ))}
                </select>
                <Errores id={id("producto-errores")} mensajes={errores[ruta("productoId")]} />
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor={id("cantidad")} className="text-xs text-gray-700">
                  Cantidad
                </label>
                <input
                  id={id("cantidad")}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000000}
                  step={1}
                  value={linea.cantidad}
                  onChange={(e) => cambiarLinea(linea.clave, "cantidad", e.target.value)}
                  onBlur={() => alSalirDe(ruta("cantidad"))}
                  aria-invalid={Boolean(errores[ruta("cantidad")])}
                  aria-describedby={errores[ruta("cantidad")] ? id("cantidad-errores") : undefined}
                  className={claseCampo(errores[ruta("cantidad")])}
                />
                <Errores id={id("cantidad-errores")} mensajes={errores[ruta("cantidad")]} />
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor={id("precio")} className="text-xs text-gray-700">
                  Precio unitario (Bs)
                </label>
                <input
                  id={id("precio")}
                  inputMode="decimal"
                  maxLength={14}
                  placeholder="12,50"
                  value={linea.precioUnitario}
                  onChange={(e) => cambiarLinea(linea.clave, "precioUnitario", e.target.value)}
                  onBlur={() => alSalirDe(ruta("precioUnitario"))}
                  aria-invalid={Boolean(errores[ruta("precioUnitario")])}
                  aria-describedby={errores[ruta("precioUnitario")] ? id("precio-errores") : undefined}
                  className={claseCampo(errores[ruta("precioUnitario")])}
                />
                <Errores id={id("precio-errores")} mensajes={errores[ruta("precioUnitario")]} />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-700">Subtotal</span>
                <output aria-live="polite" className="py-2 text-right tabular-nums sm:min-w-28">
                  {subtotal == null ? "—" : formatearCentavos(subtotal)}
                </output>
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Boton variante="secundario" onClick={() => setLineas((actuales) => [...actuales, lineaVacia()])}>
            Agregar producto
          </Boton>
          <p className="text-lg">
            Total: <output className="font-semibold tabular-nums">{totalCentavos === null ? "—" : formatearCentavos(totalCentavos)}</output>
          </p>
        </div>
        <p className="text-xs text-gray-600">Los subtotales y el total definitivos los calcula el sistema al guardar.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Registrar compra"}
        </Boton>
        <Link href="/compras" className="px-2 py-2 text-sm text-marca underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
