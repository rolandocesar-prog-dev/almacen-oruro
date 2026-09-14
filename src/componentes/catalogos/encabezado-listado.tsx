import Link from "next/link";

/** Título de un listado con el total de registros y el botón de alta. */
export function EncabezadoListado({ titulo, total, rutaAlta, textoAlta }: { titulo: string; total: string; rutaAlta: string; textoAlta: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        <p className="text-sm text-gray-600">{total}</p>
      </div>
      <Link href={rutaAlta} className="rounded-md bg-marca px-4 py-2 text-sm font-medium text-white hover:bg-marca-oscuro">
        {textoAlta}
      </Link>
    </div>
  );
}

/** Enlace "Editar" de una ficha, con aspecto de botón secundario. */
export function EnlaceEditar({ ruta }: { ruta: string }) {
  return (
    <Link href={ruta} className="rounded-md border border-marca bg-white px-4 py-2 text-sm font-medium text-marca hover:bg-fondo">
      Editar
    </Link>
  );
}
