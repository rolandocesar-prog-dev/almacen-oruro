import Link from "next/link";

/**
 * Enlaces "Anterior · Página n de m · Siguiente" para listados que crecen sin límite (sesiones,
 * compras). `enlace` arma la URL de cada página conservando los filtros. Con una sola página no
 * muestra nada.
 */
export function Paginacion({ pagina, paginas, enlace }: { pagina: number; paginas: number; enlace: (pagina: number) => string }) {
  if (paginas <= 1) return null;

  return (
    <nav aria-label="Páginas" className="flex items-center gap-3 text-sm">
      {pagina > 1 && (
        <Link href={enlace(pagina - 1)} className="rounded-lg border border-borde bg-white px-3 py-1.5 font-medium text-marca hover:border-marca">
          ← Anterior
        </Link>
      )}
      <span className="text-texto-suave">
        Página {pagina} de {paginas}
      </span>
      {pagina < paginas && (
        <Link href={enlace(pagina + 1)} className="rounded-lg border border-borde bg-white px-3 py-1.5 font-medium text-marca hover:border-marca">
          Siguiente →
        </Link>
      )}
    </nav>
  );
}
