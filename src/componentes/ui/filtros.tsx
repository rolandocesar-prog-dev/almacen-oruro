"use client";

import { useState, type FormEvent } from "react";
import type { ZodType } from "zod";
import { Aviso } from "./aviso";

/**
 * Formulario de filtros por URL (método GET). Antes de enviar valida los valores con el mismo
 * esquema Zod que usa la página en el servidor (constitución, principio VI).
 *
 * Un esquema Zod no se puede pasar desde una página (servidor) a un componente de cliente, así
 * que cada listado tiene su propio componente de cliente (ej. filtros-personal.tsx) que importa
 * su esquema y usa este.
 */
export function Filtros({
  esquema,
  accion,
  children,
}: {
  esquema: ZodType;
  accion: string;
  children: React.ReactNode;
}) {
  const [mensaje, setMensaje] = useState<string | null>(null);

  function validarAntesDeEnviar(evento: FormEvent<HTMLFormElement>) {
    const valores = Object.fromEntries(new FormData(evento.currentTarget));
    const resultado = esquema.safeParse(valores);
    if (!resultado.success) {
      evento.preventDefault();
      setMensaje(resultado.error.issues.map((problema) => problema.message).join(". "));
    } else {
      setMensaje(null);
    }
  }

  return (
    <form method="get" action={accion} onSubmit={validarAntesDeEnviar} className="flex flex-col gap-3 rounded-md border border-borde bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        {children}
        <button type="submit" className="rounded-md bg-marca px-4 py-2 text-sm font-medium text-white hover:bg-marca-oscuro">
          Aplicar
        </button>
        <a href={accion} className="px-2 py-2 text-sm text-marca underline">
          Limpiar
        </a>
      </div>
      {mensaje && <Aviso tipo="error">{mensaje}</Aviso>}
    </form>
  );
}
