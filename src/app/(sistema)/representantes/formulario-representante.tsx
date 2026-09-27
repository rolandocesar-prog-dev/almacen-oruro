"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useValidacion } from "@/componentes/formularios/use-validacion";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import { Campo } from "@/componentes/ui/campo";
import { Selector } from "@/componentes/ui/selector";
import { esquemaRepresentante } from "@/esquemas/catalogos/representante";
import type { ResultadoAccion } from "@/lib/errores";

type Props = {
  accion: (estadoPrevio: ResultadoAccion | undefined, datos: FormData) => Promise<ResultadoAccion>;
  centros: { id: number; etiqueta: string; activo: boolean }[];
  valores?: {
    nombre?: string;
    apellido?: string;
    ci?: string;
    telefono?: string | null;
    centroSaludId?: number;
  };
  textoBoton: string;
  rutaCancelar: string;
};

/** Formulario de representante para registrar o editar. Conserva lo escrito si el servidor rechaza. */
export function FormularioRepresentante({ accion, centros, valores = {}, textoBoton, rutaCancelar }: Props) {
  const [resultado, enviar, enviando] = useActionState<ResultadoAccion | undefined, FormData>(accion, undefined);
  const { errores, alEnviar, alSalirDelCampo } = useValidacion(esquemaRepresentante, resultado, enviar);

  const centrosActivos = centros.filter((centro) => centro.activo);
  // FR-005: el selector trae solo centros sin representante activo; si queda uno solo, ya viene elegido.
  const centroInicial = valores.centroSaludId ?? (centrosActivos.length === 1 ? centrosActivos[0]?.id : undefined);
  const sinCentros = centros.length === 0;

  return (
    <form onSubmit={alEnviar} noValidate className="flex max-w-2xl flex-col gap-4 rounded-lg border border-borde bg-white p-6">
      {resultado?.ok === false && (
        <Aviso tipo="error" enlace={resultado.enlace}>
          {resultado.mensaje}
        </Aviso>
      )}
      {/* RN-18: un representante activo por centro, así que puede no quedar ningún centro libre. */}
      {sinCentros && (
        <Aviso tipo="informacion" enlace={{ texto: "Registrar centro de salud", ruta: "/centros-salud/nuevo" }}>
          No hay centros de salud disponibles: cada centro activo ya tiene su representante. Registra un centro
          nuevo o, si cambió la persona responsable, desactiva primero a la anterior.
        </Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="nombre" etiqueta="Nombre" maxLength={60} defaultValue={valores.nombre} required errores={errores.nombre} onBlur={alSalirDelCampo} />
        <Campo id="apellido" etiqueta="Apellido" maxLength={60} defaultValue={valores.apellido} required errores={errores.apellido} onBlur={alSalirDelCampo} />
        <Campo
          id="ci"
          etiqueta="CI"
          ayuda="Dígitos y, si tiene complemento, un guion: 4567890-1B"
          maxLength={15}
          autoCapitalize="characters"
          autoComplete="off"
          defaultValue={valores.ci}
          required
          errores={errores.ci}
          onBlur={alSalirDelCampo}
        />
        <Campo
          id="telefono"
          etiqueta="Teléfono (opcional)"
          type="tel"
          maxLength={20}
          defaultValue={valores.telefono ?? ""}
          errores={errores.telefono}
          onBlur={alSalirDelCampo}
        />
        <Selector
          id="centroSaludId"
          etiqueta="Centro de salud"
          textoVacio="Elige un centro de salud"
          opciones={centros}
          defaultValue={centroInicial ?? ""}
          required
          errores={errores.centroSaludId}
          onBlur={alSalirDelCampo}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Boton type="submit" disabled={enviando || sinCentros}>
          {enviando ? "Guardando…" : textoBoton}
        </Boton>
        <Link href={rutaCancelar} className="px-2 py-2 text-sm text-marca underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
