"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { Campo } from "@/componentes/ui/campo";
import { esquemaNuevoInforme } from "@/esquemas/ia";
import { erroresPorRuta, type ResultadoAccion } from "@/lib/errores";
import { generarInformeAccion } from "../acciones";

type Errores = Partial<Record<string, string[]>>;

/**
 * Formulario de informe nuevo (FR-010). El período viene con el mes anterior completo. Mientras el
 * modelo redacta —puede tardar hasta un minuto— el botón queda deshabilitado y lo dice.
 */
export function FormularioInforme({ desde: desdeInicial, hasta: hastaInicial }: { desde: string; hasta: string }) {
  const [tipo, setTipo] = useState("");
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);
  const [errores, setErrores] = useState<Errores>({});
  const [resultado, setResultado] = useState<ResultadoAccion>();
  const [generando, iniciar] = useTransition();

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = { tipo, desde, hasta };
    const validacion = esquemaNuevoInforme.safeParse(datos);
    if (!validacion.success) {
      setErrores(erroresPorRuta(validacion.error));
      return;
    }
    setErrores({});
    setResultado(undefined);
    iniciar(async () => {
      // Si todo sale bien la acción redirige a la ficha; si no, devuelve el motivo.
      const respuesta = await generarInformeAccion(datos);
      setResultado(respuesta);
      if (!respuesta.ok) setErrores(respuesta.errores ?? {});
    });
  }

  const erroresTipo = errores.tipo;

  return (
    <form onSubmit={enviar} noValidate className="flex max-w-xl flex-col gap-4 rounded-md border border-borde bg-white p-4">
      {resultado && !resultado.ok && (
        <Aviso tipo="error">
          {resultado.mensaje}{" "}
          <Link href="/ia/informes" className="font-medium underline">
            Ver informes guardados
          </Link>
        </Aviso>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="tipo" className="text-sm font-medium">
          Tipo de informe
        </label>
        <select
          id="tipo"
          name="tipo"
          value={tipo}
          onChange={(evento) => setTipo(evento.target.value)}
          aria-invalid={Boolean(erroresTipo?.length)}
          aria-describedby={erroresTipo?.length ? "tipo-errores" : undefined}
          className={`rounded-md border bg-white px-3 py-2 text-base ${erroresTipo?.length ? "border-error" : "border-borde"}`}
        >
          <option value="">Elige un tipo</option>
          <option value="COMPRAS">Informe IA de compras</option>
          <option value="DISTRIBUCIONES">Informe IA de distribuciones</option>
        </select>
        {erroresTipo?.length ? (
          <ul id="tipo-errores" className="text-sm text-error">
            {erroresTipo.map((mensaje) => (
              <li key={mensaje}>{mensaje}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="desde" etiqueta="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} errores={errores.desde} />
        <Campo id="hasta" etiqueta="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} errores={errores.hasta} />
      </div>

      <p className="text-sm text-gray-600">
        Generar un informe nuevo necesita conexión a internet; los informes ya guardados se consultan e imprimen sin ella. La redacción
        puede tardar hasta un minuto.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Boton type="submit" disabled={generando}>
          {generando ? "Generando el informe…" : "Generar informe"}
        </Boton>
        <Link href="/ia/informes" className="text-sm text-marca underline">
          Cancelar
        </Link>
      </div>
      {generando && (
        <p role="status" className="text-sm text-gray-600">
          Calculando los datos del período y esperando la redacción. No cierres esta pantalla.
        </p>
      )}
    </form>
  );
}
