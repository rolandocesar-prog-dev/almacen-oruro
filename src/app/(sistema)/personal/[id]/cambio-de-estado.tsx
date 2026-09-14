"use client";

import { useActionState } from "react";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import type { ResultadoAccion } from "@/lib/errores";

type Props = {
  nombreCompleto: string;
  activo: boolean;
  esElMismoUsuario: boolean;
  desactivar: () => Promise<ResultadoAccion>;
  reactivar: () => Promise<ResultadoAccion>;
};

/** Botones para desactivar o reactivar a una persona, con confirmación y resultado (Historia 4). */
export function CambioDeEstado({ nombreCompleto, activo, esElMismoUsuario, desactivar, reactivar }: Props) {
  const [resultado, ejecutar, enviando] = useActionState<ResultadoAccion | undefined>(
    () => (activo ? desactivar() : reactivar()),
    undefined,
  );

  // Nadie puede desactivarse a sí mismo (RN-04): el botón ni siquiera se muestra.
  if (activo && esElMismoUsuario) return null;

  function confirmar(evento: React.FormEvent<HTMLFormElement>) {
    const pregunta = `¿Desactivar a ${nombreCompleto}? Ya no podrá ingresar y se cerrarán sus sesiones abiertas.`;
    if (activo && !window.confirm(pregunta)) evento.preventDefault();
  }

  return (
    <div className="flex flex-col gap-2">
      {resultado && <Aviso tipo={resultado.ok ? "exito" : "error"}>{resultado.mensaje}</Aviso>}
      <form action={ejecutar} onSubmit={confirmar}>
        <Boton type="submit" variante={activo ? "peligro" : "secundario"} disabled={enviando}>
          {activo ? "Desactivar" : "Reactivar"}
        </Boton>
      </form>
    </div>
  );
}
