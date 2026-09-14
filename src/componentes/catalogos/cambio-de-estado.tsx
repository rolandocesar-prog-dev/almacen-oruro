"use client";

import { useActionState } from "react";
import { Aviso } from "@/componentes/ui/aviso";
import { Boton } from "@/componentes/ui/boton";
import type { ResultadoAccion } from "@/lib/errores";

type Props = {
  activo: boolean;
  /** Oculta "Desactivar" cuando no corresponde, por ejemplo en la propia ficha de personal (RN-04). */
  ocultarDesactivar?: boolean;
  /** Pregunta que se confirma antes de desactivar; cada ficha explica qué consecuencias tiene. */
  confirmacionDesactivar: string;
  desactivar: () => Promise<ResultadoAccion>;
  reactivar: () => Promise<ResultadoAccion>;
};

/**
 * Botón para desactivar o reactivar un registro, con confirmación y resultado.
 * Lo usan el personal (F-001) y los catálogos (F-002). Nada se borra: solo cambia el estado (principio V).
 * La confirmación es una ayuda; las reglas que impiden la baja (RN-13) las verifica siempre el servidor.
 */
export function CambioDeEstado({ activo, ocultarDesactivar = false, confirmacionDesactivar, desactivar, reactivar }: Props) {
  const [resultado, ejecutar, enviando] = useActionState<ResultadoAccion | undefined>(
    () => (activo ? desactivar() : reactivar()),
    undefined,
  );

  if (activo && ocultarDesactivar) return null;

  function confirmar(evento: React.FormEvent<HTMLFormElement>) {
    if (activo && !window.confirm(confirmacionDesactivar)) evento.preventDefault();
  }

  return (
    <div className="flex flex-col gap-2">
      {resultado && (
        <Aviso tipo={resultado.ok ? "exito" : "error"} enlace={resultado.ok ? undefined : resultado.enlace}>
          {resultado.mensaje}
        </Aviso>
      )}
      <form action={ejecutar} onSubmit={confirmar}>
        <Boton type="submit" variante={activo ? "peligro" : "secundario"} disabled={enviando}>
          {activo ? "Desactivar" : "Reactivar"}
        </Boton>
      </form>
    </div>
  );
}
