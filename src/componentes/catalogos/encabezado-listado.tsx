import Link from "next/link";
import { Icono } from "@/componentes/ui/icono";

/** Título de un listado con el total de registros y el botón de alta. */
export function EncabezadoListado({ titulo, total, rutaAlta, textoAlta }: { titulo: string; total: string; rutaAlta: string; textoAlta: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-[28px]">{titulo}</h1>
        <p className="text-sm text-texto-suave">{total}</p>
      </div>
      <Link
        href={rutaAlta}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-white hover:bg-marca-oscuro"
      >
        <Icono nombre="mas" className="size-4" />
        {textoAlta}
      </Link>
    </div>
  );
}

/** Enlace "Editar" de una ficha, con aspecto de botón secundario. */
export function EnlaceEditar({ ruta }: { ruta: string }) {
  return (
    <Link href={ruta} className="inline-flex min-h-10 items-center rounded-lg border border-marca bg-white px-4 py-2 text-sm font-semibold text-marca hover:bg-marca-claro">
      Editar
    </Link>
  );
}
